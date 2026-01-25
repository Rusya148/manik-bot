export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const apiFetch = async <T>(input: RequestInfo, init?: RequestInit) => {
  const initData = window.Telegram?.WebApp?.initData;
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
