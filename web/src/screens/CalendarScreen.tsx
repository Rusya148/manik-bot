import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getClientsByDay, getMarkedDays } from "@/services/api/clients";
import { useAppStore } from "@/stores/useAppStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { Button } from "@/shared/ui/Button";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import {
  addDays,
  buildMonthGrid,
  buildTimeSlots,
  formatDateTitle,
  getMonthLabel,
  toLocalIsoDate,
  toLocalIsoMonth,
} from "@/shared/utils/date";
import { Timeline } from "@/features/calendar/Timeline";
import { Booking } from "@/types/domain";

const CalendarScreen = () => {
  const selectedDate = useAppStore((state) => state.selectedDate);
  const setSelectedDate = useAppStore((state) => state.setSelectedDate);
  const openBooking = useAppStore((state) => state.openBooking);
  const settings = useSettingsStore();
  const [cursor, setCursor] = useState(() => selectedDate.slice(0, 7));
  const [todayOpen, setTodayOpen] = useState(false);

  useEffect(() => {
    const month = selectedDate.slice(0, 7);
    if (month !== cursor) setCursor(month);
  }, [cursor, selectedDate]);

  const { data, isLoading } = useQuery({
    queryKey: ["clients", "day", selectedDate],
    queryFn: () => getClientsByDay(selectedDate),
  });

  const todayIso = toLocalIsoDate(new Date());
  const { data: todayClients } = useQuery({
    queryKey: ["clients", "day", todayIso],
    queryFn: () => getClientsByDay(todayIso),
  });

  const [year, month] = cursor.split("-").map(Number);
  const monthIndex = month - 1;
  const grid = useMemo(() => buildMonthGrid(year, monthIndex), [monthIndex, year]);

  const { data: markedDays } = useQuery({
    queryKey: ["clients", "marked-days", year, month],
    queryFn: () => getMarkedDays(year, month),
  });

  const markedSet = new Set(markedDays?.days ?? []);

  const bookings = useMemo<Booking[]>(
    () =>
      (data ?? [])
        .map((item) => ({
          id: item.id,
          name: item.name,
          link: item.link,
          time: item.time,
          date: item.date,
          prepaymentDisplay: item.prepayment_display ?? undefined,
        }))
        .sort((a, b) => a.time.localeCompare(b.time)),
    [data],
  );

  const slots = useMemo(
    () => buildTimeSlots(settings.workdayStart, settings.workdayEnd, settings.slotStepMinutes),
    [settings.workdayEnd, settings.workdayStart, settings.slotStepMinutes],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-hint">Календарь</div>
          <SectionTitle>{formatDateTitle(selectedDate)}</SectionTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
          >
            ←
          </Button>
          <Button
            variant="secondary"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          >
            →
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button className="flex-1" onClick={() => openBooking()}>
          Новая запись
        </Button>
        <Button variant="secondary" onClick={() => setSelectedDate(toLocalIsoDate(new Date()))}>
          Сегодня
        </Button>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">{getMonthLabel(year, monthIndex)}</div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                const date = new Date(year, monthIndex - 1, 1);
                setCursor(toLocalIsoMonth(date));
              }}
            >
              ←
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const date = new Date(year, monthIndex + 1, 1);
                setCursor(toLocalIsoMonth(date));
              }}
            >
              →
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs text-hint">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {grid.map((cell, idx) => {
            if (!cell) return <div key={`empty-${idx}`} className="h-10" />;
            const isActive = cell.iso === selectedDate;
            const isMarked = markedSet.has(cell.day);
            const isToday = cell.iso === todayIso;
            return (
              <button
                key={cell.iso}
                className={`h-10 rounded-2xl text-sm ${
                  isActive
                    ? "bg-accent text-[var(--app-accent-text)]"
                    : isMarked || isToday
                      ? "bg-[color:var(--app-bg)] text-accent"
                      : "bg-[color:var(--app-bg)] text-hint"
                }`}
                onClick={() => setSelectedDate(cell.iso)}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
        {!!todayClients?.length && (
          <div className="text-xs text-accent">Сегодня есть записи.</div>
        )}
      </div>

      {isLoading ? (
        <div className="card p-4 text-sm text-hint">Загрузка расписания...</div>
      ) : (
        <Timeline
          slots={slots}
          bookings={bookings}
          onSlotClick={(time) => openBooking({ time })}
          onBookingClick={(bookingId) => openBooking({ bookingId })}
        />
      )}

      <Button className="w-full" variant="secondary" onClick={() => setTodayOpen(true)}>
        Записи на сегодня
      </Button>

      <BottomSheet
        open={todayOpen}
        onClose={() => setTodayOpen(false)}
        title="Сегодняшние записи"
      >
        <div className="space-y-2 text-sm">
          {todayClients?.length ? (
            todayClients
              .slice()
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((client) => (
                <div
                  key={`${client.id}-${client.time}`}
                  className="rounded-xl bg-[color:var(--app-bg)] px-3 py-2"
                >
                  <div className="font-medium">{client.time}</div>
                  <div className="text-xs text-hint">{client.name}</div>
                  <div className="text-xs text-hint">{client.link}</div>
                </div>
              ))
          ) : (
            <div className="text-xs text-hint">На сегодня записей нет.</div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
};

export default CalendarScreen;
