import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getClientsByDay } from "@/services/api/clients";
import { useAppStore } from "@/stores/useAppStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { Button } from "@/shared/ui/Button";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { addDays, buildTimeSlots, formatDateTitle, getWeekDays } from "@/shared/utils/date";
import { Timeline } from "@/features/calendar/Timeline";
import { Booking } from "@/types/domain";

const CalendarScreen = () => {
  const selectedDate = useAppStore((state) => state.selectedDate);
  const setSelectedDate = useAppStore((state) => state.setSelectedDate);
  const openBooking = useAppStore((state) => state.openBooking);
  const settings = useSettingsStore();

  const { data, isLoading } = useQuery({
    queryKey: ["clients", "day", selectedDate],
    queryFn: () => getClientsByDay(selectedDate),
  });

  const bookings = useMemo<Booking[]>(
    () =>
      (data ?? [])
        .map((item) => ({
          id: item.id,
          name: item.name,
          phone: item.link,
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

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

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
        <Button variant="secondary" onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}>
          Сегодня
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const isActive = day === selectedDate;
          const weekday = new Date(`${day}T00:00:00`).getDay();
          const isWeekend = settings.weekendDays.includes((weekday + 6) % 7);
          return (
            <button
              key={day}
              className={`rounded-2xl px-2 py-2 text-xs ${
                isActive
                  ? "bg-accent text-[var(--app-accent-text)]"
                  : isWeekend
                    ? "bg-[color:var(--app-card)] text-accent"
                    : "bg-[color:var(--app-card)] text-hint"
              }`}
              onClick={() => setSelectedDate(day)}
            >
              {day.slice(8, 10)}
            </button>
          );
        })}
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
    </div>
  );
};

export default CalendarScreen;
