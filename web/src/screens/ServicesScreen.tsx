import { useState } from "react";
import { useServicesStore } from "@/stores/useServicesStore";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { Input } from "@/shared/ui/Input";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { ServiceItem } from "@/types/domain";

const emptyDraft = { title: "", durationMinutes: 60, price: 0 };

const ServicesScreen = () => {
  const services = useServicesStore((state) => state.services);
  const addService = useServicesStore((state) => state.addService);
  const updateService = useServicesStore((state) => state.updateService);
  const removeService = useServicesStore((state) => state.removeService);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [draft, setDraft] = useState(emptyDraft);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setOpen(true);
  };

  const openEdit = (service: ServiceItem) => {
    setEditing(service);
    setDraft({
      title: service.title,
      durationMinutes: service.durationMinutes,
      price: service.price ?? 0,
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!draft.title.trim()) return;
    if (editing) {
      updateService(editing.id, {
        title: draft.title.trim(),
        durationMinutes: Number(draft.durationMinutes) || 0,
        price: Number(draft.price) || 0,
      });
    } else {
      addService({
        title: draft.title.trim(),
        durationMinutes: Number(draft.durationMinutes) || 0,
        price: Number(draft.price) || 0,
      });
    }
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-hint">Услуги</div>
          <SectionTitle>Ваши услуги</SectionTitle>
        </div>
        <Button variant="secondary" onClick={openCreate}>
          Добавить
        </Button>
      </div>

      <div className="space-y-3">
        {services.map((service) => (
          <Card key={service.id} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">{service.title}</div>
              <div className="text-xs text-hint">
                {service.durationMinutes} мин · {service.price ?? 0} ₽
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => openEdit(service)}>
                Изменить
              </Button>
              <button
                className="rounded-xl px-3 py-2 text-xs text-hint"
                onClick={() => removeService(service.id)}
              >
                Удалить
              </button>
            </div>
          </Card>
        ))}
        {!services.length && (
          <div className="card p-4 text-sm text-hint">Добавьте первую услугу.</div>
        )}
      </div>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Редактировать услугу" : "Новая услуга"}
      >
        <div className="space-y-3">
          <div>
            <div className="text-xs text-hint">Название</div>
            <Input
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Маникюр + покрытие"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-hint">Длительность, мин</div>
              <Input
                type="number"
                value={draft.durationMinutes}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    durationMinutes: Number(event.target.value),
                  }))
                }
              />
            </div>
            <div>
              <div className="text-xs text-hint">Цена, ₽</div>
              <Input
                type="number"
                value={draft.price}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, price: Number(event.target.value) }))
                }
              />
            </div>
          </div>
          <Button onClick={handleSave}>
            {editing ? "Сохранить" : "Создать"}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
};

export default ServicesScreen;
