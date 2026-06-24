import { create } from 'zustand';
import type { PopupInfo } from './popup';

// Coordinates the report-details overlay between the map (which sets the report[s] under a tap)
// and the overlay (which renders them). Lifting this out of the map lets the overlay render as a
// route-level sibling, so the map and reports features no longer import each other (ADR 0006).
type ReportPopupState = {
  popup: PopupInfo | null;
  setPopup: (info: PopupInfo) => void;
  closePopup: () => void;
};

export const useReportPopupStore = create<ReportPopupState>((set) => ({
  popup: null,
  setPopup: (info) => set({ popup: info }),
  closePopup: () => set({ popup: null }),
}));
