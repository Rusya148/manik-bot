import { apiFetch } from "./http";

export const getAccessStatus = () =>
  apiFetch<{ access: boolean; is_admin: boolean }>("/api/access");
