import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getClientsByRange } from "@/services/api/clients";
import { BottomSheet } from "@/shared/ui/BottomSheet";
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

type ClientGroup = {
  name: string;
  link: string;
  visits: string[];
  ids: number[];
  note: string;
};

const ClientsScreen = () => {
  const [search, setSearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyClient, setHistoryClient] = useState<ClientGroup | null>(null);
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
      return {
        ...entry,
        visits,
        ids: entry.ids,
        note: "",
      };
    });
  }, [data]);

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
                  <div className="text-xs text-hint">Посещений: {client.visits.length}</div>
                </div>
                <button
                  className="rounded-xl bg-[color:var(--app-bg)] px-3 py-2 text-xs text-accent"
                  onClick={() => {
                    setHistoryClient(client);
                    setHistoryOpen(true);
                  }}
                >
                  Открыть
                </button>
              </div>
            </Card>
          ))}
          {!filtered.length && (
            <div className="card p-4 text-sm text-hint">Клиенты не найдены.</div>
          )}
        </div>
      )}

      <BottomSheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="История записей"
      >
        {historyClient ? (
          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold">{historyClient.name}</div>
              <div className="text-xs text-hint">{historyClient.link}</div>
            </div>
            <div className="max-h-[55vh] overflow-y-auto pr-1">
              <div className="space-y-2">
                {historyClient.visits.map((visit) => {
                  const [date, time] = visit.split(" ");
                  return (
                    <div
                      key={visit}
                      className="flex items-center justify-between rounded-xl bg-[color:var(--app-bg)] px-3 py-2 text-sm"
                    >
                      <span>{formatDayShort(date)}</span>
                      <span className="font-medium">{time}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-hint">Нет данных.</div>
        )}
      </BottomSheet>
    </div>
  );
};

export default ClientsScreen;
