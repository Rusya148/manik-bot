import clsx from "clsx";
import { Booking } from "@/types/domain";
import { normalizeTimeInput } from "@/shared/utils/date";

type Props = {
  slots: string[];
  bookings: Booking[];
  onSlotClick: (time: string) => void;
  onBookingClick: (bookingId: number) => void;
};

export const Timeline = ({ slots, bookings, onSlotClick, onBookingClick }: Props) => {
  const normalizedBookings = bookings.map((booking) => ({
    ...booking,
    time: normalizeTimeInput(booking.time),
  }));
  const bookingByTime = new Map(normalizedBookings.map((b) => [b.time, b]));
  const allTimes = Array.from(
    new Set([...slots, ...normalizedBookings.map((booking) => booking.time)]),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="card divide-y divide-[color:var(--app-border)]">
      {allTimes.map((time) => {
        const booking = bookingByTime.get(time);
        return (
          <button
            key={time}
            className={clsx(
              "flex w-full items-center gap-3 px-4 py-4 text-left",
              booking ? "bg-[color:var(--app-card)]" : "bg-transparent",
            )}
            onClick={() => (booking ? onBookingClick(booking.id) : onSlotClick(time))}
          >
            <div className="w-12 text-sm text-hint">{time}</div>
            <div className="flex-1">
              {booking ? (
                <div className="rounded-2xl bg-[color:var(--app-bg)] px-3 py-3">
                  <div className="text-sm font-semibold">{booking.name}</div>
                  <div className="text-xs text-hint">
                    {booking.link}
                    {booking.prepaymentDisplay ? ` · ${booking.prepaymentDisplay}` : ""}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-hint">Свободно</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
