export type ScreenKey = "calendar" | "schedule" | "clients" | "services" | "settings";

export type Booking = {
  id: number;
  name: string;
  link: string;
  time: string;
  date: string;
  prepaymentDisplay?: string;
};

export type BookingMeta = {
  serviceId?: string;
  durationMinutes?: number;
  comment?: string;
};

export type ServiceItem = {
  id: string;
  title: string;
  durationMinutes: number;
  price?: number;
};

export type Settings = {
  workdayStart: string;
  workdayEnd: string;
  slotStepMinutes: 30 | 15 | 60;
  weekendDays: number[];
  timeFormat: "24h" | "12h";
};
