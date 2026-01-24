export const formatDateTitle = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(date);
};

export const formatDayShort = (isoDate: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${isoDate}T00:00:00`));

export const addDays = (isoDate: string, delta: number) => {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
};

export const buildTimeSlots = (start: string, end: string, step: number) => {
  const toMinutes = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  };
  const toTime = (minutes: number) => {
    const hh = Math.floor(minutes / 60);
    const mm = minutes % 60;
    return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
  };
  const result: string[] = [];
  let cursor = toMinutes(start);
  const endMinutes = toMinutes(end);
  while (cursor <= endMinutes) {
    result.push(toTime(cursor));
    cursor += step;
  }
  return result;
};

export const getWeekDays = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00`);
  const day = (date.getDay() + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  return Array.from({ length: 7 }).map((_, idx) => {
    const current = new Date(start);
    current.setDate(start.getDate() + idx);
    return current.toISOString().slice(0, 10);
  });
};
