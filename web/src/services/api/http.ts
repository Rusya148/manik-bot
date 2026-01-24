export const apiFetch = async <T>(input: RequestInfo, init?: RequestInit) => {
  const res = await fetch(input, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "API error");
  }
  return res.json() as Promise<T>;
};
