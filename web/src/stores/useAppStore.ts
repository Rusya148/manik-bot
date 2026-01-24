import { create } from "zustand";
import { ScreenKey } from "@/types/domain";
import { toLocalIsoDate } from "@/shared/utils/date";

type AppState = {
  activeScreen: ScreenKey;
  selectedDate: string;
  bookingOpen: boolean;
  editingBookingId: number | null;
  bookingDraftTime: string | null;
  setActiveScreen: (screen: ScreenKey) => void;
  setSelectedDate: (date: string) => void;
  openBooking: (params?: { time?: string; bookingId?: number | null }) => void;
  closeBooking: () => void;
};

const todayIso = () => toLocalIsoDate(new Date());

export const useAppStore = create<AppState>((set) => ({
  activeScreen: "calendar",
  selectedDate: todayIso(),
  bookingOpen: false,
  editingBookingId: null,
  bookingDraftTime: null,
  setActiveScreen: (screen) => set({ activeScreen: screen }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  openBooking: (params) =>
    set({
      bookingOpen: true,
      editingBookingId: params?.bookingId ?? null,
      bookingDraftTime: params?.time ?? null,
    }),
  closeBooking: () =>
    set({ bookingOpen: false, editingBookingId: null, bookingDraftTime: null }),
}));
