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
  normalizeTimeInput,
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
          time: normalizeTimeInput(item.time),
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
                const nextCursor = toLocalIsoMonth(date);
                setCursor(nextCursor);
                setSelectedDate(`${nextCursor}-01`);
              }}
            >
              ←
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const date = new Date(year, monthIndex + 1, 1);
                const nextCursor = toLocalIsoMonth(date);
                setCursor(nextCursor);
                setSelectedDate(`${nextCursor}-01`);
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

      <div className="card p-4 space-y-2">
        <div className="text-sm font-semibold">Записи на выбранный день</div>
        {bookings.length ? (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-[72px_1fr_1fr_64px] gap-2 text-xs text-hint">
              <div className="text-left">Время</div>
              <div className="text-left">Имя</div>
              <div className="text-left">Ссылка</div>
              <div className="text-right">Предоплата</div>
            </div>
            {bookings.map((booking) => (
              <button
                key={`${booking.id}-${booking.time}`}
                className="grid w-full grid-cols-[72px_1fr_1fr_64px] items-center gap-2 rounded-xl bg-[color:var(--app-bg)] px-3 py-2 text-left"
                onClick={() => openBooking({ bookingId: booking.id })}
              >
                <span className="font-medium">{booking.time}</span>
                <span className="truncate text-xs text-hint">{booking.name}</span>
                <span className="truncate text-xs text-hint">
                  {booking.link?.startsWith("@") ? (
                    <button
                      type="button"
                      className="inline-flex max-w-full items-center gap-1 text-accent"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigator.clipboard?.writeText(booking.link);
                        window.dispatchEvent(
                          new CustomEvent("app:toast", { detail: { message: "Скопировано" } }),
                        );
                      }}
                    >
                      <span className="truncate">{booking.link}</span>
                      <span className="text-[11px] text-hint">⧉</span>
                    </button>
                  ) : (
                    "—"
                  )}
                </span>
                <span className="text-right text-xs text-[color:var(--app-accent)]">
                  {booking.prepaymentDisplay ?? "✗"}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs text-hint">Записей нет.</div>
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
      <div className="text-xs text-hint">
        Время можно вводить как 10:00, 10.00 или 10-00.
      </div>

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
              .sort((a, b) =>
                normalizeTimeInput(a.time).localeCompare(normalizeTimeInput(b.time)),
              )
              .map((client) => (
                <div
                  key={`${client.id}-${client.time}`}
                  className="rounded-xl bg-[color:var(--app-bg)] px-3 py-2"
                >
                  <div className="font-medium">{normalizeTimeInput(client.time)}</div>
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
