import type { CreateSavedAreaInput } from '@/features/saved-areas/schemas/saved-area.schema';
import type { SavedArea } from '@/features/saved-areas/types';
import { del, get, patch, post } from '@/shared/lib/api/fetch';
import { VISITOR_ID_HEADER } from '@/shared/lib/security/visitor-id';

const BASE = '/api/saved-areas';

function visitorHeader(visitorId: string): HeadersInit {
  return { [VISITOR_ID_HEADER]: visitorId };
}

export const savedAreasApi = {
  list(visitorId: string) {
    return get<SavedArea[]>(BASE, undefined, visitorHeader(visitorId));
  },
  create(visitorId: string, input: CreateSavedAreaInput) {
    return post<SavedArea>(BASE, input, visitorHeader(visitorId));
  },
  rename(visitorId: string, id: string, name: string | null) {
    return patch<SavedArea>(`${BASE}/${id}`, { name }, visitorHeader(visitorId));
  },
  remove(visitorId: string, id: string) {
    return del(`${BASE}/${id}`, visitorHeader(visitorId));
  },
};
