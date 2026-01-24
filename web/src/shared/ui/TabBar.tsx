import clsx from "clsx";
import { ScreenKey } from "@/types/domain";

type Tab = { key: ScreenKey; label: string };

const tabs: Tab[] = [
  { key: "calendar", label: "Календарь" },
  { key: "schedule", label: "Расписание" },
  { key: "clients", label: "Клиенты" },
  { key: "settings", label: "Настройки" },
];

type Props = {
  active: ScreenKey;
  onChange: (key: ScreenKey) => void;
};

export const TabBar = ({ active, onChange }: Props) => (
  <div
    className={clsx(
      "fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--app-border)]",
      "bg-[color:var(--app-card)] px-4 pb-[calc(12px+var(--safe-area-bottom))] pt-2",
    )}
  >
    <div className="grid grid-cols-4 gap-2 text-center text-xs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={clsx(
            "rounded-xl px-2 py-2 font-medium",
            active === tab.key
              ? "bg-[color:var(--app-bg)] text-accent"
              : "text-hint",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  </div>
);
