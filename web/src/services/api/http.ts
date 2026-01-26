export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const getInitData = () => {
  const direct = window.Telegram?.WebApp?.initData;
  if (direct) return direct;
  const hash = window.location.hash?.replace(/^#/, "");
  if (!hash) return "";
  const params = new URLSearchParams(hash);
  const data = params.get("tgWebAppData");
  return data ? decodeURIComponent(data) : "";
};

export const apiFetch = async <T>(input: RequestInfo, init?: RequestInit) => {
  const initData = getInitData();
  const headers = {
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
    ...(initData ? { "X-Telegram-Init-Data": initData } : {}),
  };
  const res = await fetch(input, {
    headers,
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || "API error");
  }
  return res.json() as Promise<T>;
};
