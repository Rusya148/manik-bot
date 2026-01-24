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

export const toLocalIsoDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const toLocalIsoMonth = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
};

export const addDays = (isoDate: string, delta: number) => {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + delta);
  return toLocalIsoDate(date);
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
    return toLocalIsoDate(current);
  });
};

export const getMonthLabel = (year: number, monthIndex: number) =>
  new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(
    new Date(year, monthIndex, 1),
  );

export const buildMonthGrid = (year: number, monthIndex: number) => {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const firstWeekday = (first.getDay() + 6) % 7;
  const totalDays = last.getDate();
  const grid: Array<{ day: number; iso: string } | null> = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    grid.push(null);
  }
  for (let day = 1; day <= totalDays; day += 1) {
    const iso = toLocalIsoDate(new Date(year, monthIndex, day));
    grid.push({ day, iso });
  }
  while (grid.length % 7 !== 0) {
    grid.push(null);
  }
  return grid;
};
