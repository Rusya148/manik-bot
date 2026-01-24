import { nanoid } from "nanoid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ServiceItem } from "@/types/domain";

type ServicesState = {
  services: ServiceItem[];
  addService: (service: Omit<ServiceItem, "id">) => void;
  updateService: (id: string, updates: Partial<ServiceItem>) => void;
  removeService: (id: string) => void;
};

const seed: ServiceItem[] = [
  { id: "service-basic", title: "Маникюр", durationMinutes: 60, price: 0 },
];

export const useServicesStore = create<ServicesState>()(
  persist(
    (set) => ({
      services: seed,
      addService: (service) =>
        set((state) => ({
          services: [...state.services, { ...service, id: nanoid() }],
        })),
      updateService: (id, updates) =>
        set((state) => ({
          services: state.services.map((item) =>
            item.id === id ? { ...item, ...updates } : item,
          ),
        })),
      removeService: (id) =>
        set((state) => ({
          services: state.services.filter((item) => item.id !== id),
        })),
    }),
    { name: "manik-services" },
  ),
);
