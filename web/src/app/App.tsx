import { useEffect, useRef, useState } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { useAppStore } from "@/stores/useAppStore";
import { TabBar } from "@/shared/ui/TabBar";
import CalendarScreen from "@/screens/CalendarScreen";
import ScheduleScreen from "@/screens/ScheduleScreen";
import ClientsScreen from "@/screens/ClientsScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import BookingSheet from "@/features/booking/BookingSheet";
import { ApiError, getInitData } from "@/services/api/http";
import { getAccessStatus } from "@/services/api/access";

const App = () => {
  const { webApp } = useTelegram();
  const activeScreen = useAppStore((state) => state.activeScreen);
  const setActiveScreen = useAppStore((state) => state.setActiveScreen);
  const bookingOpen = useAppStore((state) => state.bookingOpen);
  const closeBooking = useAppStore((state) => state.closeBooking);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [accessState, setAccessState] = useState<
    "loading" | "granted" | "denied" | "no_init"
  >("loading");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [debugEnabled] = useState(
    () =>
      window.location.search.includes("debug=1") ||
      window.location.hash.includes("debug=1"),
  );

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
    let inFlight = false;

    const tryAccess = async () => {
      if (inFlight || cancelled) return;
      inFlight = true;
      try {
        await getAccessStatus();
        if (!cancelled) setAccessState("granted");
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError) {
          setAccessError(error.message);
          const message = error.message.toLowerCase();
          if (
            error.status === 401 &&
            (message.includes("missing init data") || message.includes("hash missing"))
          ) {
            return;
          }
          if (error.status === 401 || error.status === 403) {
            setAccessState("denied");
            return;
          }
        } else {
          setAccessError(error instanceof Error ? error.message : String(error));
          setAccessState("denied");
          return;
        }
        setAccessState("denied");
      } finally {
        inFlight = false;
      }
    };

    const timer = window.setInterval(() => {
      attempts += 1;
      const hasInitData = Boolean(getInitData());
      if (hasInitData || debugEnabled) {
        tryAccess();
        if (hasInitData) {
          return;
        }
      }
      if (attempts >= maxAttempts) {
        window.clearInterval(timer);
        if (!cancelled) setAccessState("no_init");
      }
    }, 150);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [debugEnabled, webApp]);

  if (accessState !== "granted") {
    const initData = getInitData();
    const initDataPreview =
      initData && initData.length > 120
        ? `${initData.slice(0, 120)}…`
        : initData || "—";
    const copyInitData = () => {
      if (!initData) {
        setToast("initData пуст");
        return;
      }
      const doToast = () => setToast("initData скопирован");
      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(initData)
          .then(doToast)
          .catch(() => {
            window.prompt("initData", initData);
          });
        return;
      }
      window.prompt("initData", initData);
    };
    return (
      <div className="app-shell flex h-[var(--viewport-height)] items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <div className="text-sm text-hint">
            {accessState === "loading"
              ? "Проверяем доступ..."
              : accessState === "no_init"
                ? "Нет данных Telegram WebApp"
                : "Нет доступа"}
          </div>
          <div className="text-base font-semibold text-[color:var(--tg-text-color)]">
            {accessState === "loading"
              ? "Подождите немного"
              : accessState === "no_init"
                ? "Откройте через кнопку WebApp в боте"
                : "Попросите администратора выдать доступ"}
          </div>
          {accessError && (
            <div className="text-xs text-[color:#d9534f]">{accessError}</div>
          )}
          {debugEnabled && (
            <div className="space-y-2 rounded-2xl bg-[color:var(--app-card)] px-4 py-3 text-left text-xs text-hint">
              <div>
                Telegram.WebApp: {window.Telegram?.WebApp ? "есть" : "нет"}
              </div>
              <div>initData длина: {initData.length || 0}</div>
              <div className="break-all">initData: {initDataPreview}</div>
              <button
                type="button"
                className="mt-2 w-full rounded-xl bg-[color:var(--app-bg)] px-3 py-2 text-xs text-accent"
                onClick={copyInitData}
              >
                Скопировать initData
              </button>
            </div>
          )}
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
