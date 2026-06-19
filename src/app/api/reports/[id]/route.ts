import { flagDisputeThreshold } from '@/features/reports/lifecycle';
import { prisma } from '@/shared/lib/prisma';
import { reportImageUrl } from '@/shared/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      description: true,
      createdAt: true,
      expiresAt: true,
      confirmations: true,
      flags: true,
      imageKey: true,
      lng: true,
      lat: true,
    },
  });

  if (!report) {
    return Response.json({ error: 'Nie znaleziono zgłoszenia' }, { status: 404 });
  }

  if (report.expiresAt && report.expiresAt < new Date()) {
    return Response.json({ error: 'Zgłoszenie wygasło' }, { status: 404 });
  }

  if (report.flags - report.confirmations >= flagDisputeThreshold(report.type)) {
    return Response.json({ error: 'Zgłoszenie zostało usunięte' }, { status: 404 });
  }

  return Response.json({
    id: report.id,
    type: report.type,
    description: report.description,
    createdAt: report.createdAt.toISOString(),
    expiresAt: report.expiresAt ? report.expiresAt.toISOString() : null,
    confirmations: report.confirmations,
    flags: report.flags,
    imageUrl: reportImageUrl(report.imageKey),
    lng: report.lng,
    lat: report.lat,
  });
}
