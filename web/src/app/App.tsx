import { useEffect, useRef, useState } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { useAppStore } from "@/stores/useAppStore";
import { TabBar } from "@/shared/ui/TabBar";
import CalendarScreen from "@/screens/CalendarScreen";
import ScheduleScreen from "@/screens/ScheduleScreen";
import ClientsScreen from "@/screens/ClientsScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import BookingSheet from "@/features/booking/BookingSheet";
import { ApiError } from "@/services/api/http";
import { getAccessStatus } from "@/services/api/access";

const App = () => {
  const { webApp } = useTelegram();
  const activeScreen = useAppStore((state) => state.activeScreen);
  const setActiveScreen = useAppStore((state) => state.setActiveScreen);
  const bookingOpen = useAppStore((state) => state.bookingOpen);
  const closeBooking = useAppStore((state) => state.closeBooking);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [accessState, setAccessState] = useState<"loading" | "granted" | "denied">("loading");

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

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 50;
    const timer = window.setInterval(() => {
      attempts += 1;
      const hasInitData =
        Boolean(webApp?.initData) || window.location.hash.includes("tgWebAppData=");
      if (hasInitData) {
        window.clearInterval(timer);
        getAccessStatus()
          .then(() => {
            if (!cancelled) setAccessState("granted");
          })
          .catch((error) => {
            if (cancelled) return;
            if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
              setAccessState("denied");
              return;
            }
            setAccessState("denied");
          });
        return;
      }
      if (attempts >= maxAttempts) {
        window.clearInterval(timer);
        if (!cancelled) setAccessState("denied");
      }
    }, 100);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [webApp]);

  if (accessState !== "granted") {
    return (
      <div className="app-shell flex h-[var(--viewport-height)] items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <div className="text-sm text-hint">
            {accessState === "loading" ? "Проверяем доступ..." : "Нет доступа"}
          </div>
          <div className="text-base font-semibold text-[color:var(--tg-text-color)]">
            {accessState === "loading"
              ? "Подождите немного"
              : "Попросите администратора выдать доступ"}
          </div>
        </div>
      </div>
    );
  }

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
