import { apiFetch } from "./http";

export const getSelectedDays = (year: number, month: number) =>
  apiFetch<{ days: number[] }>(`/api/schedule/selected?year=${year}&month=${month}`);

export const toggleSelectedDay = (payload: { year: number; month: number; day: number }) =>
  apiFetch<{ selected: boolean; days: number[] }>("/api/schedule/toggle", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getScheduleSlots = () =>
  apiFetch<{ slots: Record<string, string> }>("/api/schedule/slots");

export const updateScheduleSlots = (payload: { slots: Record<string, string> }) =>
  apiFetch<{ status: string; slots: Record<string, string> }>("/api/schedule/slots", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const resetScheduleSlots = () =>
  apiFetch<{ status: string; slots: Record<string, string> }>("/api/schedule/slots/reset", {
    method: "POST",
  });

export const generateScheduleMessage = (year: number, month: number, slots?: Record<string, string>) =>
  apiFetch<{ lines: string[] }>(`/api/schedule/generate?year=${year}&month=${month}`, {
    method: "POST",
    body: JSON.stringify({ slots }),
  });
