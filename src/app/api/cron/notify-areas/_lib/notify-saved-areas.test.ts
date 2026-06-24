import type { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteSubscriptionByEndpoint, listSubscriptions } from '@/features/push/queries/push-repo';
import { buildAreaAlert, newHazards, signatureOf } from '@/features/safety/area-alert';
import { listAreasForAlerts, updateAlertSignature } from '@/features/saved-areas/queries/saved-areas-repo';
import { sendPush } from '@/shared/lib/push/send';
import { notifySavedAreas } from './notify-saved-areas';

vi.mock('@/app/api/risk/_lib/assess-point', () => ({ assessPoint: vi.fn().mockResolvedValue({}) }));
vi.mock('@/features/safety/area-alert', () => ({
  activeHazards: vi.fn(() => ['ban']),
  signatureOf: vi.fn(() => 'ban:1'),
  newHazards: vi.fn(() => ['ban']),
  buildAreaAlert: vi.fn(() => ({ title: 'Uwaga', body: 'zakaz wstepu' })),
}));
vi.mock('@/features/saved-areas/queries/saved-areas-repo', () => ({
  listAreasForAlerts: vi.fn(),
  updateAlertSignature: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/features/push/queries/push-repo', () => ({
  listSubscriptions: vi.fn(),
  deleteSubscriptionByEndpoint: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/shared/lib/push/send', () => ({ sendPush: vi.fn() }));

const prisma = {} as PrismaClient;
const subscription = { id: 's1', endpoint: 'https://push.example/e1', p256dh: 'p', auth: 'a' };

function area(overrides: Record<string, unknown> = {}) {
  return {
    id: 'area1',
    visitorId: 'v1',
    name: 'Las pod domem',
    lat: 50,
    lng: 20,
    radiusMeters: 5000,
    lastAlertSignature: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(signatureOf).mockReturnValue('ban:1');
  vi.mocked(newHazards).mockReturnValue(['ban']);
  vi.mocked(buildAreaAlert).mockReturnValue({ title: 'Uwaga', body: 'zakaz wstepu' });
  vi.mocked(listSubscriptions).mockResolvedValue([subscription]);
});

describe('notifySavedAreas - signature advances only after delivery', () => {
  it('does NOT advance the signature when every push transiently fails', async () => {
    vi.mocked(listAreasForAlerts).mockResolvedValue([area()]);
    vi.mocked(sendPush).mockResolvedValue({ delivered: false, gone: false });

    const summary = await notifySavedAreas(prisma);

    expect(updateAlertSignature).not.toHaveBeenCalled();
    expect(summary.notificationsSent).toBe(0);
  });

  it('advances the signature after at least one successful delivery', async () => {
    vi.mocked(listAreasForAlerts).mockResolvedValue([area()]);
    vi.mocked(sendPush).mockResolvedValue({ delivered: true, gone: false });

    await notifySavedAreas(prisma);

    expect(updateAlertSignature).toHaveBeenCalledWith(prisma, 'area1', 'ban:1');
  });

  it('advances the signature when there is no one to notify', async () => {
    vi.mocked(listAreasForAlerts).mockResolvedValue([area()]);
    vi.mocked(listSubscriptions).mockResolvedValue([]);

    await notifySavedAreas(prisma);

    expect(updateAlertSignature).toHaveBeenCalledWith(prisma, 'area1', 'ban:1');
  });

  it('records a cleared hazard even though it sends nothing', async () => {
    vi.mocked(listAreasForAlerts).mockResolvedValue([area({ lastAlertSignature: 'ban:1' })]);
    vi.mocked(newHazards).mockReturnValue([]);
    vi.mocked(buildAreaAlert).mockReturnValue(null);
    vi.mocked(signatureOf).mockReturnValue(null);

    await notifySavedAreas(prisma);

    expect(updateAlertSignature).toHaveBeenCalledWith(prisma, 'area1', null);
    expect(sendPush).not.toHaveBeenCalled();
  });

  it('leaves an unchanged standing hazard alone', async () => {
    vi.mocked(listAreasForAlerts).mockResolvedValue([area({ lastAlertSignature: 'ban:1' })]);
    vi.mocked(newHazards).mockReturnValue([]);
    vi.mocked(buildAreaAlert).mockReturnValue(null);

    await notifySavedAreas(prisma);

    expect(updateAlertSignature).not.toHaveBeenCalled();
    expect(sendPush).not.toHaveBeenCalled();
  });

  it('prunes a gone subscription without advancing on transient-only outcomes', async () => {
    vi.mocked(listAreasForAlerts).mockResolvedValue([area()]);
    vi.mocked(sendPush).mockResolvedValue({ delivered: false, gone: true });

    const summary = await notifySavedAreas(prisma);

    expect(deleteSubscriptionByEndpoint).toHaveBeenCalledWith(prisma, subscription.endpoint);
    expect(summary.prunedSubscriptions).toBe(1);
    expect(updateAlertSignature).not.toHaveBeenCalled();
  });
});
