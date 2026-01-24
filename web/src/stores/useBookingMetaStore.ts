import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BookingMeta } from "@/types/domain";

type BookingMetaState = {
  metaByKey: Record<string, BookingMeta>;
  setMeta: (key: string, meta: BookingMeta) => void;
  clearMeta: (key: string) => void;
};

export const buildBookingKey = (date: string, time: string, phone: string) =>
  `${date}__${time}__${phone}`;

export const useBookingMetaStore = create<BookingMetaState>()(
  persist(
    (set) => ({
      metaByKey: {},
      setMeta: (key, meta) =>
        set((state) => ({
          metaByKey: { ...state.metaByKey, [key]: meta },
        })),
      clearMeta: (key) =>
        set((state) => {
          const next = { ...state.metaByKey };
          delete next[key];
          return { metaByKey: next };
        }),
    }),
    { name: "manik-booking-meta" },
  ),
);
