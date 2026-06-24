import type { PrismaClient } from '@prisma/client';
import { assessPoint } from '@/app/_lib/assess-point';
import { deleteSubscriptionByEndpoint, listSubscriptions } from '@/features/push/queries/push-repo';
import { activeHazards, buildAreaAlert, newHazards, signatureOf } from '@/features/safety/area-alert';
import { type AlertArea, listAreasForAlerts, updateAlertSignature } from '@/features/saved-areas/queries/saved-areas-repo';
import { sendPush } from '@/shared/lib/push/send';

function areaLabel(area: AlertArea): string {
  return area.name?.trim() || `${area.lat.toFixed(3)}, ${area.lng.toFixed(3)}`;
}

export type NotifyAreasSummary = {
  areas: number;
  alerted: number;
  notificationsSent: number;
  prunedSubscriptions: number;
};

// Server-side sweep over every saved area, run after a BDL sync. Re-assesses each point against
// our local PostGIS and pushes only when a RED hazard (ban / fire III) has newly appeared since
// the last alert. Per the safety rule it never sends an "all clear".
export async function notifySavedAreas(prisma: PrismaClient): Promise<NotifyAreasSummary> {
  const areas = await listAreasForAlerts(prisma);

  let alerted = 0;
  let notificationsSent = 0;
  let prunedSubscriptions = 0;

  for (const area of areas) {
    const assessment = await assessPoint(prisma, area.lat, area.lng, area.radiusMeters);
    const current = activeHazards(assessment);
    const signature = signatureOf(current);
    const onset = newHazards(area.lastAlertSignature, current);
    const alert = buildAreaAlert(areaLabel(area), onset);

    // No new hazard to deliver (set unchanged, or a hazard cleared) - recording the current set is
    // safe: it never suppresses an alert, and resetting after a clear lets a later re-onset fire.
    if (!alert) {
      if (signature !== area.lastAlertSignature) {
        await updateAlertSignature(prisma, area.id, signature);
      }

      continue;
    }

    alerted += 1;

    const subscriptions = await listSubscriptions(prisma, area.visitorId);
    let deliveredAny = false;

    for (const subscription of subscriptions) {
      const result = await sendPush(subscription, { ...alert, url: '/' });

      if (result.delivered) {
        deliveredAny = true;
        notificationsSent += 1;
      }

      if (result.gone) {
        await deleteSubscriptionByEndpoint(prisma, subscription.endpoint);
        prunedSubscriptions += 1;
      }
    }

    // Advance the signature only once the visitor has actually been told (or there is no one to
    // tell). A transient push-service failure (timeout / 5xx) must not advance it - otherwise the
    // next sweep would treat the still-standing hazard as already-alerted and skip the retry,
    // silently dropping a safety alert.
    if (deliveredAny || subscriptions.length === 0) {
      await updateAlertSignature(prisma, area.id, signature);
    }
  }

  return {
    areas: areas.length,
    alerted,
    notificationsSent,
    prunedSubscriptions,
  };
}
