import { apiFetch } from "./http";

export type ApiClient = {
  id: number;
  name: string;
  link: string;
  time: string;
  date: string;
  prepayment?: number | null;
  prepayment_display?: string;
};

export const getClientsByDay = (date: string) =>
  apiFetch<ApiClient[]>(`/api/clients/day?date_iso=${encodeURIComponent(date)}`);

export const getClientsByRange = (start: string, end: string) =>
  apiFetch<ApiClient[]>(
    `/api/clients?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  );

export const createClient = (payload: {
  name: string;
  link: string;
  time: string;
  date: string;
  prepayment?: number;
}) =>
  apiFetch<{ status: string }>("/api/clients", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateClient = (
  id: number,
  payload: { name: string; link: string; time: string; date: string; prepayment?: number },
) =>
  apiFetch<{ status: string }>(`/api/clients/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteClient = (id: number) =>
  apiFetch<{ status: string }>(`/api/clients/${id}`, { method: "DELETE" });
