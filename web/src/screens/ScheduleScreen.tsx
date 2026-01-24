import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import {
  buildMonthGrid,
  getMonthLabel,
  normalizeTimeInput,
  toLocalIsoMonth,
} from "@/shared/utils/date";
import {
  generateScheduleMessage,
  getSelectedDays,
  toggleSelectedDay,
} from "@/services/api/schedule";

const weekdayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const ScheduleScreen = () => {
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState(() => toLocalIsoMonth(new Date()));
  const [message, setMessage] = useState<string[]>([]);

  const [year, month] = cursor.split("-").map(Number);
  const monthIndex = month - 1;

  const grid = useMemo(() => buildMonthGrid(year, monthIndex), [year, monthIndex]);

  const { data: selectedData } = useQuery({
    queryKey: ["schedule", "selected", year, month],
    queryFn: () => getSelectedDays(year, month),
  });

  const selectedDays = new Set(selectedData?.days ?? []);

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

  const normalizeTimesInText = (value: string) =>
    value.replace(/\b\d{1,2}[.:]\d{2}\b/g, (match) => normalizeTimeInput(match));

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
            return (
              <button
                key={cell.iso}
                className={`h-10 rounded-2xl text-sm ${
                  active
                    ? "bg-accent text-[var(--app-accent-text)]"
                    : "bg-[color:var(--app-bg)] text-hint"
                }`}
                onClick={() => toggleMutation.mutate(cell.day)}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-hint">Нажимай на дни, чтобы отметить рабочие.</div>
      </Card>

      <Card className="space-y-3">
        <div className="text-sm font-semibold">Сообщение для отправки</div>
        <Button onClick={() => generateMutation.mutate()}>Сгенерировать</Button>
        {message.length > 0 && (
          <div className="space-y-2 text-sm">
            {message.map((line, idx) => {
              if (!line) return <div key={`empty-${idx}`}>&nbsp;</div>;
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
            <button
              className="text-xs text-accent"
              onClick={async () => {
                const normalized = message
                  .map((line) =>
                    line
                      .replace(/<s>(.*?)<\/s>/g, (_, text) => `<s>${normalizeTimesInText(text)}</s>`)
                      .replace(/\s+/g, " ")
                      .trim(),
                  )
                  .join("\n");
                const plain = normalized.replace(/<\/?s>/g, "");
                try {
                  if (navigator.clipboard && "write" in navigator.clipboard) {
                    const item = new ClipboardItem({
                      "text/plain": new Blob([plain], { type: "text/plain" }),
                      "text/html": new Blob([normalized], { type: "text/html" }),
                    });
                    await navigator.clipboard.write([item]);
                  } else {
                    await navigator.clipboard?.writeText(plain);
                  }
                  window.dispatchEvent(
                    new CustomEvent("app:toast", { detail: { message: "Скопировано" } }),
                  );
                } catch {
                  await navigator.clipboard?.writeText(plain);
                }
              }}
            >
              Скопировать текст
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ScheduleScreen;
