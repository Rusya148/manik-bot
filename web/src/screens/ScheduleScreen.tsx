import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { buildMonthGrid, getMonthLabel } from "@/shared/utils/date";
import {
  generateScheduleMessage,
  getScheduleSlots,
  getSelectedDays,
  resetScheduleSlots,
  toggleSelectedDay,
  updateScheduleSlots,
} from "@/services/api/schedule";

const weekdayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const ScheduleScreen = () => {
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState(() => new Date().toISOString().slice(0, 7));
  const [message, setMessage] = useState<string[]>([]);

  const [year, month] = cursor.split("-").map(Number);
  const monthIndex = month - 1;

  const grid = useMemo(() => buildMonthGrid(year, monthIndex), [year, monthIndex]);

  const { data: selectedData } = useQuery({
    queryKey: ["schedule", "selected", year, month],
    queryFn: () => getSelectedDays(year, month),
  });

  const { data: slotsData } = useQuery({
    queryKey: ["schedule", "slots"],
    queryFn: getScheduleSlots,
  });

  const slots = slotsData?.slots ?? {};
  const selectedDays = new Set(selectedData?.days ?? []);

  const toggleMutation = useMutation({
    mutationFn: (day: number) => toggleSelectedDay({ year, month, day }),
    onSuccess: (data) => {
      queryClient.setQueryData(["schedule", "selected", year, month], { days: data.days });
    },
  });

  const saveSlotsMutation = useMutation({
    mutationFn: () => updateScheduleSlots({ slots }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedule", "slots"] }),
  });

  const resetSlotsMutation = useMutation({
    mutationFn: resetScheduleSlots,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedule", "slots"] }),
  });

  const generateMutation = useMutation({
    mutationFn: () => generateScheduleMessage(year, month, slots),
    onSuccess: (data) => setMessage(data.lines ?? []),
  });

  const updateSlotValue = (key: string, value: string) => {
    queryClient.setQueryData(["schedule", "slots"], {
      slots: { ...slots, [key]: value },
    });
  };

  const goMonth = (delta: number) => {
    const date = new Date(year, monthIndex + delta, 1);
    setCursor(date.toISOString().slice(0, 7));
  };

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
        <div className="text-sm font-semibold">Временные слоты</div>
        <div className="grid grid-cols-2 gap-3">
          {weekdayLabels.map((label, idx) => (
            <div key={label}>
              <div className="text-xs text-hint">{label}</div>
              <Input
                value={slots[idx] ?? ""}
                onChange={(event) => updateSlotValue(String(idx), event.target.value)}
                placeholder="11:00,14:00,17:00"
              />
            </div>
          ))}
        </div>
        <div className="text-xs text-hint">Формат: 11:00,14:00,17:00</div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => saveSlotsMutation.mutate()}>
            Сохранить
          </Button>
          <Button variant="secondary" onClick={() => resetSlotsMutation.mutate()}>
            Сбросить
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="text-sm font-semibold">Сообщение для отправки</div>
        <Button onClick={() => generateMutation.mutate()}>Сгенерировать</Button>
        {message.length > 0 && (
          <div className="space-y-2 text-sm">
            {message.map((line, idx) => (
              <div key={`${line}-${idx}`}>{line || " "}</div>
            ))}
            <button
              className="text-xs text-accent"
              onClick={() => navigator.clipboard?.writeText(message.join("\n"))}
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
