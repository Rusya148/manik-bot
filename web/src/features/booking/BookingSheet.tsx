import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTelegram } from "@/hooks/useTelegram";
import { useAppStore } from "@/stores/useAppStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import {
  createClient,
  deleteClient,
  getClientsByDay,
  getClientsByRange,
  updateClient,
} from "@/services/api/clients";
import { toLocalIsoDate } from "@/shared/utils/date";

type Props = {
  open: boolean;
  onClose: () => void;
};

const getRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 365);
  return { start: toLocalIsoDate(start), end: toLocalIsoDate(end) };
};

const roundTime = (base: string | null, step: number) => {
  if (!base) return "";
  const [h, m] = base.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return base;
  const minutes = h * 60 + m;
  const rounded = Math.round(minutes / step) * step;
  const hh = Math.floor(rounded / 60);
  const mm = rounded % 60;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
};

const BookingSheet = ({ open, onClose }: Props) => {
  const { webApp } = useTelegram();
  const queryClient = useQueryClient();
  const selectedDate = useAppStore((state) => state.selectedDate);
  const editingBookingId = useAppStore((state) => state.editingBookingId);
  const draftTime = useAppStore((state) => state.bookingDraftTime);
  const settings = useSettingsStore();

  const { data: dayClients } = useQuery({
    queryKey: ["clients", "day", selectedDate],
    queryFn: () => getClientsByDay(selectedDate),
    enabled: open,
  });

  const range = useMemo(getRange, []);
  const { data: knownClients } = useQuery({
    queryKey: ["clients", "range", range.start, range.end],
    queryFn: () => getClientsByRange(range.start, range.end),
    enabled: open,
  });

  const editing = useMemo(
    () => dayClients?.find((client) => client.id === editingBookingId) ?? null,
    [dayClients, editingBookingId],
  );

  const [form, setForm] = useState({
    date: selectedDate,
    time: "",
    name: "",
    link: "",
    prepayment: "",
    prepaymentEnabled: false,
  });
  const [timeError, setTimeError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        date: editing.date,
        time: editing.time,
        name: editing.name,
        link: editing.link,
        prepayment: editing.prepayment ? String(editing.prepayment) : "",
        prepaymentEnabled: Boolean(editing.prepayment),
      });
      return;
    }
    const rounded = roundTime(draftTime, settings.slotStepMinutes);
    setForm({
      date: selectedDate,
      time: rounded || draftTime || "",
      name: "",
      link: "",
      prepayment: "",
      prepaymentEnabled: false,
    });
  }, [draftTime, editing, open, selectedDate, settings.slotStepMinutes]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        link: form.link.trim(),
        time: form.time.trim(),
        date: form.date,
        prepayment: form.prepaymentEnabled
          ? Number(form.prepayment || 1)
          : 0,
      };
      if (editing) {
        return updateClient(editing.id, payload);
      }
      return createClient(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return { status: "ok" as const };
      return deleteClient(editing.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onClose();
    },
  });

  const handleSubmit = useCallback(() => {
    if (!form.name.trim() || !form.link.trim() || !form.time.trim()) return;
    if (timeError || form.time.length !== 5) return;
    mutation.mutate();
  }, [form.name, form.link, form.time, mutation, timeError]);

  useEffect(() => {
    if (!open || !webApp) return;
    const handler = () => handleSubmit();
    webApp.MainButton.setParams({
      text: editing ? "Сохранить запись" : "Создать запись",
      color: "var(--app-accent)",
      text_color: "var(--app-accent-text)",
    });
    webApp.MainButton.show();
    webApp.MainButton.onClick(handler);
    webApp.BackButton.show();
    webApp.BackButton.onClick(onClose);
    return () => {
      webApp.MainButton.offClick(handler);
      webApp.MainButton.hide();
      webApp.BackButton.offClick(onClose);
      webApp.BackButton.hide();
    };
  }, [editing, handleSubmit, onClose, open, webApp]);

  useEffect(() => {
    if (!form.link || form.name) return;
    const match = knownClients?.find((client) => client.link === form.link);
    if (match) {
      setForm((prev) => ({ ...prev, name: match.name }));
    }
  }, [form.name, form.link, knownClients]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={editing ? "Редактирование записи" : "Новая запись"}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-hint">Дата</div>
            <Input
              type="date"
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            />
          </div>
          <div>
            <div className="text-xs text-hint">Время</div>
            <Input
              type="text"
              inputMode="numeric"
              value={form.time}
              onChange={(event) => {
                const raw = event.target.value;
                if (/[^0-9:]/.test(raw)) {
                  setTimeError("Допустим только формат HH:MM.");
                  return;
                }
                let next = raw;
                if (!next.includes(":") && next.length > 2) {
                  next = `${next.slice(0, 2)}:${next.slice(2, 4)}`;
                }
                if (next.length > 5) {
                  next = next.slice(0, 5);
                }
                setForm((prev) => ({ ...prev, time: next }));
                if (next.length < 5) {
                  setTimeError(null);
                  return;
                }
                setTimeError(
                  /^([01]\d|2[0-3]):[0-5]\d$/.test(next)
                    ? null
                    : "Время должно быть в формате HH:MM.",
                );
              }}
              placeholder="10:00"
            />
            {timeError && <div className="mt-1 text-xs text-[color:#d9534f]">{timeError}</div>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-hint">Имя</div>
            <Input
              autoFocus
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Анна"
            />
          </div>
          <div>
            <div className="text-xs text-hint">Ссылка на Telegram</div>
            <Input
              value={form.link}
              onChange={(event) => setForm((prev) => ({ ...prev, link: event.target.value }))}
              placeholder="@username"
            />
          </div>
        </div>
        <div>
          <div className="text-xs text-hint">Предоплата</div>
          <label className="flex items-center gap-2 text-sm text-hint">
            <input
              type="checkbox"
              checked={form.prepaymentEnabled}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  prepaymentEnabled: event.target.checked,
                  prepayment: event.target.checked ? prev.prepayment : "",
                }))
              }
            />
            Есть предоплата
          </label>
          {form.prepaymentEnabled && (
            <Input
              type="number"
              value={form.prepayment}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, prepayment: event.target.value }))
              }
              placeholder="Сумма"
              className="mt-2"
            />
          )}
          <div className="mt-1 text-xs text-hint">
            Сумма необязательна — можно оставить пустым.
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={mutation.isPending || Boolean(timeError)}>
          {editing ? "Сохранить" : "Создать"}
        </Button>
        {editing && (
          <Button
            variant="secondary"
            className="mt-2 text-[color:#d9534f] border-[color:#d9534f]"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            Удалить запись
          </Button>
        )}
      </div>
    </BottomSheet>
  );
};

export default BookingSheet;
