import { z } from 'zod';
import { renameSavedAreaSchema } from '@/features/core/saved-area';
import { deleteSavedArea, renameSavedArea } from '@/features/saved-areas/queries/saved-areas-repo';
import { prisma } from '@/shared/lib/prisma';
import { readVisitorId } from '@/shared/lib/security/visitor-id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const visitorId = readVisitorId(request);
  if (!visitorId) {
    return Response.json({ error: 'Brak identyfikatora urządzenia' }, { status: 400 });
  }

  const { id } = await params;

  if (!(await deleteSavedArea(prisma, visitorId, id))) {
    return Response.json({ error: 'Nie znaleziono obszaru' }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const visitorId = readVisitorId(request);
  if (!visitorId) {
    return Response.json({ error: 'Brak identyfikatora urządzenia' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Nieprawidłowe dane obszaru' }, { status: 400 });
  }

  const parsed = renameSavedAreaSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Nieprawidłowe dane obszaru', issues: z.flattenError(parsed.error) }, { status: 400 });
  }

  const { id } = await params;
  const area = await renameSavedArea(prisma, visitorId, id, parsed.data.name);

  if (!area) {
    return Response.json({ error: 'Nie znaleziono obszaru' }, { status: 404 });
  }

  return Response.json(area);
}
