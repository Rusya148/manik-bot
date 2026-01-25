export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }

  interface TelegramWebApp {
    initData?: string;
    initDataUnsafe?: { user?: { id: number; first_name: string } };
    themeParams: Record<string, string>;
    colorScheme: "light" | "dark";
    safeAreaInset?: { top: number; bottom: number; left: number; right: number };
    contentSafeAreaInset?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    MainButton: TelegramWebAppMainButton;
    BackButton: TelegramWebAppBackButton;
    ready: () => void;
    expand: () => void;
    sendData: (data: string) => void;
    onEvent: (event: string, handler: () => void) => void;
    offEvent: (event: string, handler: () => void) => void;
  }

  interface TelegramWebAppMainButton {
    show: () => void;
    hide: () => void;
    setParams: (params: { text?: string; color?: string; text_color?: string }) => void;
    onClick: (handler: () => void) => void;
    offClick: (handler: () => void) => void;
  }

  interface TelegramWebAppBackButton {
    show: () => void;
    hide: () => void;
    onClick: (handler: () => void) => void;
    offClick: (handler: () => void) => void;
  }
}
