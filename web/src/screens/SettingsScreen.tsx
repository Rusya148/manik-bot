import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { normalizeTimeInput } from "@/shared/utils/date";
import {
  getScheduleSlots,
  resetScheduleSlots,
  updateScheduleSlots,
} from "@/services/api/schedule";

const weekdayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const SettingsScreen = () => {
  const settings = useSettingsStore();
  const queryClient = useQueryClient();
  const [slotsOpen, setSlotsOpen] = useState(false);

  const { data: slotsData } = useQuery({
    queryKey: ["schedule", "slots"],
    queryFn: getScheduleSlots,
  });
  const slots = slotsData?.slots ?? {};

  const saveSlotsMutation = useMutation({
    mutationFn: () => updateScheduleSlots({ slots }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedule", "slots"] }),
  });

  const resetSlotsMutation = useMutation({
    mutationFn: resetScheduleSlots,
    onSuccess: (data) => {
      queryClient.setQueryData(["schedule", "slots"], { slots: data.slots });
    },
  });

  const updateSlotValue = (key: string, value: string) => {
    queryClient.setQueryData(["schedule", "slots"], {
      slots: { ...slots, [key]: value },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-hint">Настройки</div>
        <SectionTitle>Параметры работы</SectionTitle>
      </div>

      <Card className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-hint">Начало дня</div>
            <Input
              type="text"
              inputMode="numeric"
              value={settings.workdayStart}
              onChange={(event) => settings.update({ workdayStart: event.target.value })}
              onBlur={(event) =>
                settings.update({ workdayStart: normalizeTimeInput(event.target.value) })
              }
              placeholder="10:00"
            />
            <div className="mt-1 text-xs text-hint">От этого строятся слоты.</div>
          </div>
          <div>
            <div className="text-xs text-hint">Конец дня</div>
            <Input
              type="text"
              inputMode="numeric"
              value={settings.workdayEnd}
              onChange={(event) => settings.update({ workdayEnd: event.target.value })}
              onBlur={(event) =>
                settings.update({ workdayEnd: normalizeTimeInput(event.target.value) })
              }
              placeholder="20:00"
            />
            <div className="mt-1 text-xs text-hint">Последний доступный слот.</div>
          </div>
        </div>

        <div>
          <div className="text-xs text-hint">Шаг таймслота</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[15, 30, 60].map((step) => (
              <Button
                key={step}
                variant={settings.slotStepMinutes === step ? "primary" : "secondary"}
                onClick={() => settings.update({ slotStepMinutes: step as 15 | 30 | 60 })}
              >
                {step} мин
              </Button>
            ))}
          </div>
          <div className="mt-1 text-xs text-hint">Сколько минут между слотами.</div>
        </div>
      </Card>

      <Card className="space-y-3">
        <button
          className="flex w-full items-center justify-between text-left"
          onClick={() => setSlotsOpen((prev) => !prev)}
        >
          <div className="text-sm font-semibold">Временные слоты</div>
          <span className="text-sm text-hint">{slotsOpen ? "Скрыть" : "Показать"}</span>
        </button>
        {slotsOpen && (
          <div className="space-y-3">
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
          </div>
        )}
      </Card>
    </div>
  );
};

export default SettingsScreen;
