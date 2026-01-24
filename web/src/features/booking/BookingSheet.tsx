import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTelegram } from "@/hooks/useTelegram";
import { useAppStore } from "@/stores/useAppStore";
import { useServicesStore } from "@/stores/useServicesStore";
import { useBookingMetaStore, buildBookingKey } from "@/stores/useBookingMetaStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";
import { Button } from "@/shared/ui/Button";
import { createClient, getClientsByDay, getClientsByRange, updateClient } from "@/services/api/clients";

type Props = {
  open: boolean;
  onClose: () => void;
};

const getRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 365);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
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
  const services = useServicesStore((state) => state.services);
  const settings = useSettingsStore();
  const { metaByKey, setMeta, clearMeta } = useBookingMetaStore();

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
    serviceId: services[0]?.id ?? "",
    date: selectedDate,
    time: "",
    durationMinutes: services[0]?.durationMinutes ?? 60,
    name: "",
    link: "",
    comment: "",
    prepayment: "",
  });

  useEffect(() => {
    if (!open) return;
    const defaultService = services[0];
    if (editing) {
      const key = buildBookingKey(editing.date, editing.time, editing.link);
      const meta = metaByKey[key];
      const serviceId = meta?.serviceId ?? defaultService?.id ?? "";
      const durationMinutes =
        meta?.durationMinutes ?? services.find((s) => s.id === serviceId)?.durationMinutes ?? 60;
      setForm({
        serviceId,
        date: editing.date,
        time: editing.time,
        durationMinutes,
        name: editing.name,
        link: editing.link,
        comment: meta?.comment ?? "",
        prepayment: editing.prepayment ? String(editing.prepayment) : "",
      });
      return;
    }
    const rounded = roundTime(draftTime, settings.slotStepMinutes);
    const serviceId = defaultService?.id ?? "";
    setForm({
      serviceId,
      date: selectedDate,
      time: rounded || draftTime || "",
      durationMinutes: defaultService?.durationMinutes ?? 60,
      name: "",
      link: "",
      comment: "",
      prepayment: "",
    });
  }, [draftTime, editing, metaByKey, open, selectedDate, services, settings.slotStepMinutes]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        link: form.link.trim(),
        time: form.time.trim(),
        date: form.date,
        prepayment: form.prepayment ? Number(form.prepayment) : 0,
      };
      if (editing) {
        return updateClient(editing.id, payload);
      }
      return createClient(payload);
    },
    onSuccess: () => {
      const key = buildBookingKey(form.date, form.time, form.link);
      setMeta(key, {
        serviceId: form.serviceId,
        durationMinutes: Number(form.durationMinutes) || 0,
        comment: form.comment.trim(),
      });
      if (editing) {
        const prevKey = buildBookingKey(editing.date, editing.time, editing.link);
        if (prevKey !== key) clearMeta(prevKey);
      }
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onClose();
    },
  });

  const handleSubmit = useCallback(() => {
    if (!form.name.trim() || !form.link.trim() || !form.time.trim()) return;
    mutation.mutate();
  }, [form.name, form.link, form.time, mutation]);

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

  const handleServiceChange = (serviceId: string) => {
    const service = services.find((item) => item.id === serviceId);
    setForm((prev) => ({
      ...prev,
      serviceId,
      durationMinutes: service?.durationMinutes ?? prev.durationMinutes,
    }));
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={editing ? "Редактирование записи" : "Новая запись"}
    >
      <div className="space-y-3">
        <div>
          <div className="text-xs text-hint">Услуга</div>
          <select
            className="input-base w-full text-sm"
            value={form.serviceId}
            onChange={(event) => handleServiceChange(event.target.value)}
          >
            {!services.length && <option value="">Без услуги</option>}
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.title}
              </option>
            ))}
          </select>
          <div className="mt-1 text-xs text-hint">Выберите услугу из списка.</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-hint">Дата</div>
            <Input
              type="date"
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            />
            <div className="mt-1 text-xs text-hint">День записи клиента.</div>
          </div>
          <div>
            <div className="text-xs text-hint">Время</div>
            <Input
              type="time"
              value={form.time}
              onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
            />
            <div className="mt-1 text-xs text-hint">Время начала услуги.</div>
          </div>
        </div>
        <div>
          <div className="text-xs text-hint">Длительность, мин</div>
          <Input
            type="number"
            value={form.durationMinutes}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                durationMinutes: Number(event.target.value),
              }))
            }
          />
          <div className="mt-1 text-xs text-hint">Можно изменить длительность вручную.</div>
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
            <div className="mt-1 text-xs text-hint">Имя клиента для карточки.</div>
          </div>
          <div>
            <div className="text-xs text-hint">Ссылка на Telegram</div>
            <Input
              value={form.link}
              onChange={(event) => setForm((prev) => ({ ...prev, link: event.target.value }))}
              placeholder="@username"
            />
            <div className="mt-1 text-xs text-hint">Например, @client.</div>
          </div>
        </div>
        <div>
          <div className="text-xs text-hint">Комментарий</div>
          <Textarea
            value={form.comment}
            onChange={(event) => setForm((prev) => ({ ...prev, comment: event.target.value }))}
          />
          <div className="mt-1 text-xs text-hint">Короткая заметка для себя.</div>
        </div>
        <div>
          <div className="text-xs text-hint">Предоплата</div>
          <Input
            type="number"
            value={form.prepayment}
            onChange={(event) => setForm((prev) => ({ ...prev, prepayment: event.target.value }))}
            placeholder="0"
          />
          <div className="mt-1 text-xs text-hint">Необязательное поле.</div>
        </div>
        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          {editing ? "Сохранить" : "Создать"}
        </Button>
      </div>
    </BottomSheet>
  );
};

export default BookingSheet;
