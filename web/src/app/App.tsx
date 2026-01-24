import { useEffect, useRef, useState } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { useAppStore } from "@/stores/useAppStore";
import { TabBar } from "@/shared/ui/TabBar";
import CalendarScreen from "@/screens/CalendarScreen";
import ScheduleScreen from "@/screens/ScheduleScreen";
import ClientsScreen from "@/screens/ClientsScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import BookingSheet from "@/features/booking/BookingSheet";

const App = () => {
  useTelegram();
  const activeScreen = useAppStore((state) => state.activeScreen);
  const setActiveScreen = useAppStore((state) => state.setActiveScreen);
  const bookingOpen = useAppStore((state) => state.bookingOpen);
  const closeBooking = useAppStore((state) => state.closeBooking);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      setToast(detail?.message ?? "Скопировано");
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 1200);
    };
    window.addEventListener("app:toast", handler);
    return () => window.removeEventListener("app:toast", handler);
  }, []);

  return (
    <div
      className="app-shell"
      onPointerDown={(event) => {
        const target = event.target as HTMLElement | null;
        if (!target) return;
        const isInteractive = target.closest("input, textarea, select, button");
        if (!isInteractive) {
          (document.activeElement as HTMLElement | null)?.blur();
        }
      }}
      onCopy={(event) => {
        if (!event.clipboardData) return;
        const text = event.clipboardData.getData("text/plain");
        if (!text) return;
        setToast("Скопировано");
        if (toastTimer.current) window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 1200);
      }}
    >
      {activeScreen === "calendar" && <CalendarScreen />}
      {activeScreen === "schedule" && <ScheduleScreen />}
      {activeScreen === "clients" && <ClientsScreen />}
      {activeScreen === "settings" && <SettingsScreen />}

      <BookingSheet open={bookingOpen} onClose={closeBooking} />
      <TabBar active={activeScreen} onChange={setActiveScreen} />

      {toast && (
        <div className="pointer-events-none fixed bottom-[84px] left-1/2 z-50 -translate-x-1/2 rounded-full bg-[color:var(--app-card)] px-4 py-2 text-xs text-hint shadow-card">
          {toast}
        </div>
      )}
    </div>
  );
};

export default App;
