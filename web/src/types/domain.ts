export type ScreenKey = "calendar" | "schedule" | "clients" | "settings";

export type Booking = {
  id: number;
  name: string;
  link: string;
  time: string;
  date: string;
  prepaymentDisplay?: string;
};

export type Settings = {
  workdayStart: string;
  workdayEnd: string;
  slotStepMinutes: 30 | 15 | 60;
  weekendDays: number[];
  timeFormat: "24h" | "12h";
};
