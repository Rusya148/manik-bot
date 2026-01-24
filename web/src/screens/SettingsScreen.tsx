import { useSettingsStore } from "@/stores/useSettingsStore";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";

const weekdays = [
  { id: 0, label: "Пн" },
  { id: 1, label: "Вт" },
  { id: 2, label: "Ср" },
  { id: 3, label: "Чт" },
  { id: 4, label: "Пт" },
  { id: 5, label: "Сб" },
  { id: 6, label: "Вс" },
];

const SettingsScreen = () => {
  const settings = useSettingsStore();

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
              type="time"
              value={settings.workdayStart}
              onChange={(event) => settings.update({ workdayStart: event.target.value })}
            />
          </div>
          <div>
            <div className="text-xs text-hint">Конец дня</div>
            <Input
              type="time"
              value={settings.workdayEnd}
              onChange={(event) => settings.update({ workdayEnd: event.target.value })}
            />
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
        </div>

        <div>
          <div className="text-xs text-hint">Выходные</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {weekdays.map((day) => {
              const active = settings.weekendDays.includes(day.id);
              return (
                <Button
                  key={day.id}
                  variant={active ? "primary" : "secondary"}
                  onClick={() => {
                    const next = active
                      ? settings.weekendDays.filter((id) => id !== day.id)
                      : [...settings.weekendDays, day.id];
                    settings.update({ weekendDays: next });
                  }}
                >
                  {day.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-xs text-hint">Формат времени</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["24h", "12h"] as const).map((format) => (
              <Button
                key={format}
                variant={settings.timeFormat === format ? "primary" : "secondary"}
                onClick={() => settings.update({ timeFormat: format })}
              >
                {format === "24h" ? "24 часа" : "12 часов"}
              </Button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsScreen;
