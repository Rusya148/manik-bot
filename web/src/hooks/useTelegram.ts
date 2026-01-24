import { useEffect, useMemo, useState } from "react";

const getThemeValue = (params: Record<string, string>, key: string, fallback: string) =>
  params[key] ?? fallback;

export const useTelegram = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const applyTheme = () => {
      const theme = tg.themeParams || {};
      const root = document.documentElement.style;
      root.setProperty("--tg-bg-color", getThemeValue(theme, "bg_color", "#f5f5f5"));
      root.setProperty("--tg-text-color", getThemeValue(theme, "text_color", "#111111"));
      root.setProperty(
        "--tg-hint-color",
        getThemeValue(theme, "hint_color", "#8a8a8a"),
      );
      root.setProperty(
        "--tg-link-color",
        getThemeValue(theme, "link_color", "#2f80ed"),
      );
      root.setProperty(
        "--tg-button-color",
        getThemeValue(theme, "button_color", "#2f80ed"),
      );
      root.setProperty(
        "--tg-button-text-color",
        getThemeValue(theme, "button_text_color", "#ffffff"),
      );
      root.setProperty(
        "--tg-secondary-bg-color",
        getThemeValue(theme, "secondary_bg_color", "#ffffff"),
      );
    };

    const applySafeArea = () => {
      const inset = tg.safeAreaInset ?? tg.contentSafeAreaInset;
      if (!inset) return;
      const root = document.documentElement.style;
      root.setProperty("--safe-area-top", `${inset.top}px`);
      root.setProperty("--safe-area-bottom", `${inset.bottom}px`);
      root.setProperty("--safe-area-left", `${inset.left}px`);
      root.setProperty("--safe-area-right", `${inset.right}px`);
    };

    tg.ready();
    tg.expand();
    applyTheme();
    applySafeArea();
    tg.onEvent("themeChanged", applyTheme);
    tg.onEvent("viewportChanged", applySafeArea);
    setWebApp(tg);

    return () => {
      tg.offEvent("themeChanged", applyTheme);
      tg.offEvent("viewportChanged", applySafeArea);
    };
  }, []);

  return useMemo(
    () => ({
      webApp,
      user: webApp?.initDataUnsafe?.user ?? null,
    }),
    [webApp],
  );
};
