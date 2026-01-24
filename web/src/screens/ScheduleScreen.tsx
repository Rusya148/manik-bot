import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import {
  buildMonthGrid,
  getMonthLabel,
  normalizeTimeInput,
  toLocalIsoMonth,
  toLocalIsoDate,
} from "@/shared/utils/date";
import {
  generateScheduleMessage,
  getSelectedDays,
  toggleSelectedDay,
} from "@/services/api/schedule";
import { getClientsByDay, getMarkedDays } from "@/services/api/clients";
import { Booking } from "@/types/domain";

const weekdayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const ScheduleScreen = () => {
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState(() => toLocalIsoMonth(new Date()));
  const [message, setMessage] = useState<string[]>([]);
  const messageRef = useRef<HTMLDivElement | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => toLocalIsoDate(new Date()));

  const [year, month] = cursor.split("-").map(Number);
  const monthIndex = month - 1;

  const grid = useMemo(() => buildMonthGrid(year, monthIndex), [year, monthIndex]);

  const { data: selectedData } = useQuery({
    queryKey: ["schedule", "selected", year, month],
    queryFn: () => getSelectedDays(year, month),
  });

  const { data: markedDays } = useQuery({
    queryKey: ["clients", "marked-days", year, month],
    queryFn: () => getMarkedDays(year, month),
  });

  const { data: dayClients } = useQuery({
    queryKey: ["clients", "day", selectedDate],
    queryFn: () => getClientsByDay(selectedDate),
  });

  const selectedDays = new Set(selectedData?.days ?? []);
  const markedSet = new Set(markedDays?.days ?? []);

  const bookings = useMemo<Booking[]>(
    () =>
      (dayClients ?? [])
        .map((item) => ({
          id: item.id,
          name: item.name,
          link: item.link,
          time: normalizeTimeInput(item.time),
          date: item.date,
          prepaymentDisplay: item.prepayment_display ?? undefined,
        }))
        .sort((a, b) => a.time.localeCompare(b.time)),
    [dayClients],
  );

  const toggleMutation = useMutation({
    mutationFn: (day: number) => toggleSelectedDay({ year, month, day }),
    onSuccess: (data) => {
      queryClient.setQueryData(["schedule", "selected", year, month], { days: data.days });
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => generateScheduleMessage(year, month),
    onSuccess: (data) => setMessage(data.lines ?? []),
  });

  const goMonth = (delta: number) => {
    const date = new Date(year, monthIndex + delta, 1);
    setCursor(toLocalIsoMonth(date));
  };

  const cleanedLines = useMemo(
    () =>
      message
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter((line) => Boolean(line)),
    [message],
  );

  const { headerLine, bodyLines } = useMemo(() => {
    const first = cleanedLines[0];
    if (first && first.toLowerCase().startsWith("расписание за")) {
      return { headerLine: first, bodyLines: cleanedLines.slice(1) };
    }
    return { headerLine: null as string | null, bodyLines: cleanedLines };
  }, [cleanedLines]);

  const buildPlainMessage = () =>
    bodyLines
      .map((line) => line.replace(/<\/?s>/g, ""))
      .join("\n");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-hint">Расписание</div>
          <SectionTitle>{getMonthLabel(year, monthIndex)}</SectionTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => goMonth(-1)}>
            ←
          </Button>
          <Button variant="secondary" onClick={() => goMonth(1)}>
            →
          </Button>
        </div>
      </div>

      <Card className="space-y-3">
        <div className="grid grid-cols-7 gap-2 text-center text-xs text-hint">
          {weekdayLabels.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {grid.map((cell, idx) => {
            if (!cell) return <div key={`empty-${idx}`} className="h-10" />;
            const active = selectedDays.has(cell.day);
            const marked = markedSet.has(cell.day);
            return (
              <button
                key={cell.iso}
                className={`h-10 rounded-2xl text-sm ${
                  active
                    ? "bg-accent text-[var(--app-accent-text)]"
                    : marked
                      ? "bg-[color:var(--app-bg)] text-accent"
                      : "bg-[color:var(--app-bg)] text-hint"
                }`}
                onClick={() => {
                  setSelectedDate(cell.iso);
                  toggleMutation.mutate(cell.day);
                }}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-hint">Нажимай на дни, чтобы отметить рабочие.</div>
      </Card>

      <Card className="space-y-2">
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
              <div
                key={`${booking.id}-${booking.time}`}
                className="grid w-full grid-cols-[72px_1fr_1fr_64px] items-center gap-2 rounded-xl bg-[color:var(--app-bg)] px-3 py-2 text-left"
              >
                <span className="font-medium">{booking.time}</span>
                <span className="truncate text-xs text-hint">{booking.name}</span>
                <span className="truncate text-xs text-hint">
                  {booking.link?.startsWith("@") ? booking.link : "—"}
                </span>
                <span className="text-right text-xs text-[color:var(--app-accent)]">
                  {booking.prepaymentDisplay ?? "✗"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-hint">Записей нет.</div>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="text-sm font-semibold">Сообщение для отправки</div>
        <Button onClick={() => generateMutation.mutate()}>Сгенерировать</Button>
        {bodyLines.length > 0 && (
          <div
            className="space-y-2 text-sm"
            ref={messageRef}
            onClick={() => {
              const container = messageRef.current;
              if (container) {
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(container);
                selection?.removeAllRanges();
                selection?.addRange(range);
                const copied = document.execCommand("copy");
                selection?.removeAllRanges();
                if (copied) {
                  window.dispatchEvent(
                    new CustomEvent("app:toast", { detail: { message: "Скопировано" } }),
                  );
                  return;
                }
              }
              const plain = buildPlainMessage();
              navigator.clipboard?.writeText(plain);
              window.dispatchEvent(
                new CustomEvent("app:toast", { detail: { message: "Скопировано" } }),
              );
            }}
          >
            {headerLine && <div className="text-sm font-semibold">{headerLine}</div>}
            {bodyLines.map((line, idx) => {
              const parts = line.split(/(<s>.*?<\/s>)/g);
              return (
                <div key={`${line}-${idx}`}>
                  {parts.map((part, partIdx) => {
                    if (part.startsWith("<s>") && part.endsWith("</s>")) {
                      const text = part.replace("<s>", "").replace("</s>", "");
                      return (
                        <span key={`${part}-${partIdx}`} className="line-through text-hint">
                          {text}
                        </span>
                      );
                    }
                    return <span key={`${part}-${partIdx}`}>{part}</span>;
                  })}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ScheduleScreen;
