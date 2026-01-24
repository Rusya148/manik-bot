import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getClientsByRange } from "@/services/api/clients";
import { useAppStore } from "@/stores/useAppStore";
import { useBookingMetaStore, buildBookingKey } from "@/stores/useBookingMetaStore";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { Input } from "@/shared/ui/Input";
import { Card } from "@/shared/ui/Card";
import { formatDayShort, toLocalIsoDate } from "@/shared/utils/date";

const getRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 365);
  return {
    start: toLocalIsoDate(start),
    end: toLocalIsoDate(end),
  };
};

const ClientsScreen = () => {
  const [search, setSearch] = useState("");
  const setSelectedDate = useAppStore((state) => state.setSelectedDate);
  const openBooking = useAppStore((state) => state.openBooking);
  const metaByKey = useBookingMetaStore((state) => state.metaByKey);
  const range = useMemo(getRange, []);

  const { data, isLoading } = useQuery({
    queryKey: ["clients", "range", range.start, range.end],
    queryFn: () => getClientsByRange(range.start, range.end),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; link: string; visits: string[]; ids: number[] }>();
    (data ?? []).forEach((client) => {
      const key = client.link || client.name;
      const entry = map.get(key) ?? {
        name: client.name,
        link: client.link,
        visits: [],
        ids: [],
      };
      entry.visits.push(`${client.date} ${client.time}`);
      entry.ids.push(client.id);
      map.set(key, entry);
    });
    return Array.from(map.values()).map((entry) => {
      const visits = entry.visits.sort().reverse();
      const latest = visits[0];
      const latestNote = latest
        ? metaByKey[buildBookingKey(latest.split(" ")[0], latest.split(" ")[1], entry.link)]
        : undefined;
      return {
        ...entry,
        visits,
        ids: entry.ids,
        note: latestNote?.comment ?? "",
      };
    });
  }, [data, metaByKey]);

  const filtered = useMemo(() => {
    if (!search) return grouped;
    const term = search.toLowerCase();
    return grouped.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.link.toLowerCase().includes(term),
    );
  }, [grouped, search]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-hint">Клиенты</div>
        <SectionTitle>Клиентская база</SectionTitle>
      </div>

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Поиск по имени или @username"
      />

      {isLoading ? (
        <div className="card p-4 text-sm text-hint">Загрузка клиентов...</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((client) => (
            <Card key={client.link} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{client.name}</div>
                  <div className="text-xs text-hint">{client.link}</div>
                </div>
                <button
                  className="rounded-xl bg-[color:var(--app-bg)] px-3 py-2 text-xs text-accent"
                  onClick={() => {
                    const latest = client.visits[0];
                    if (!latest) return;
                    const [date] = latest.split(" ");
                    setSelectedDate(date);
                    const id = client.ids[0];
                    if (id) openBooking({ bookingId: id });
                  }}
                >
                  Открыть
                </button>
              </div>
              {client.note && (
                <div className="rounded-xl bg-[color:var(--app-bg)] px-3 py-2 text-xs">
                  {client.note}
                </div>
              )}
              <div className="text-xs text-hint">История</div>
              <div className="flex flex-wrap gap-2 text-xs">
                {client.visits.slice(0, 4).map((visit) => {
                  const [date, time] = visit.split(" ");
                  return (
                    <span
                      key={visit}
                      className="rounded-full bg-[color:var(--app-bg)] px-2 py-1"
                    >
                      {formatDayShort(date)} · {time}
                    </span>
                  );
                })}
              </div>
            </Card>
          ))}
          {!filtered.length && (
            <div className="card p-4 text-sm text-hint">Клиенты не найдены.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientsScreen;
