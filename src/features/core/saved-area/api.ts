import { del, get, patch, post } from '@/shared/lib/api/fetch';
import { VISITOR_ID_HEADER } from '@/shared/lib/security/visitor-id';
import type { CreateSavedAreaInput } from './schema';
import type { SavedArea } from './types';

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
