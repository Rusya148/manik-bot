import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Settings } from "@/types/domain";

type SettingsState = Settings & {
  update: (partial: Partial<Settings>) => void;
};

const defaultSettings: Settings = {
  workdayStart: "10:00",
  workdayEnd: "20:00",
  slotStepMinutes: 30,
  weekendDays: [6],
  timeFormat: "24h",
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      update: (partial) => set(partial),
    }),
    { name: "manik-settings" },
  ),
);
