from datetime import datetime
from app.repositories.clients import ClientRepository
from app.repositories.schedule import ScheduleRepository


DEFAULT_SLOTS = {
    0: ["11:00", "14:00", "17:00", "20:00*"],
    1: ["11:00", "14:00", "17:00", "20:00*"],
    2: ["11:00", "14:00", "17:00", "20:00*"],
    3: ["11:00", "14:00", "17:00", "20:00*"],
    4: ["11:00", "14:00", "17:00", "20:00*"],
    5: ["10:00", "13:00", "16:00", "19:00*"],
    6: ["10:00", "13:00", "16:00", "19:00*"],
}

WEEKDAYS_RU_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"]
MONTHS_RU_GEN = [
    "январь",
    "февраль",
    "март",
    "апрель",
    "май",
    "июнь",
    "июль",
    "август",
    "сентябрь",
    "октябрь",
    "ноябрь",
    "декабрь",
]


def normalize_date(value: str) -> str:
    if not value:
        raise ValueError("empty date")
    value = value.strip()
    if "." in value:
        dt = datetime.strptime(value, "%d.%m.%Y")
        return dt.strftime("%Y-%m-%d")
    dt = datetime.strptime(value, "%Y-%m-%d")
    return dt.strftime("%Y-%m-%d")


def normalize_time_to_hhmm(value: str) -> str:
    if not value:
        return ""
    t = value.strip().replace(" ", "").replace(".", ":").replace("-", ":").replace("/", ":")
    if ":" not in t:
        t = f"{t}:00"
    parts = t.split(":")
    try:
        hh = int(parts[0])
    except Exception:
        return ""
    mm = int(parts[1]) if len(parts) > 1 and parts[1] != "" else 0
    hh = max(0, min(23, hh))
    mm = 0 if mm < 0 or mm > 59 else mm
    return f"{hh:02d}:{mm:02d}"


def _strip_star(value: str) -> str:
    return value.replace("*", "").strip()


def _hhmm_to_minutes(hhmm: str) -> int:
    try:
        hh, mm = hhmm.split(":")
        return int(hh) * 60 + int(mm)
    except Exception:
        return -1


def _format_hhmm_with_dot(hhmm: str) -> str:
    if not hhmm:
        return ""
    hh, mm = hhmm.split(":")
    return f"{hh}.{mm}"


def _normalize_slots_payload(raw_slots: dict) -> dict[int, list[str]]:
    normalized: dict[int, list[str]] = {}
    for k, times in raw_slots.items():
        try:
            weekday = int(k)
        except Exception:
            continue
        if isinstance(times, str):
            parts = [s.strip() for s in times.split(",") if s.strip()]
        elif isinstance(times, list):
            parts = [str(s).strip() for s in times if str(s).strip()]
        else:
            continue
        cleaned = []
        for t in parts:
            raw = str(t).strip()
            starred = raw.endswith("*")
            base = _strip_star(raw)
            norm = normalize_time_to_hhmm(base)
            if not norm:
                continue
            cleaned.append(f"{norm}*" if starred else norm)
        if cleaned:
            normalized[weekday] = cleaned
    return normalized


def _format_prepayment(value: float | None) -> str:
    if value is None:
        return "✗"
    try:
        num = float(value)
    except Exception:
        return "✗"
    if num == 0:
        return "✗"
    if num == 1:
        return "✓"
    return f"{num:.2f}".rstrip("0").rstrip(".")


def serialize_client(row) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "link": row.link,
        "time": row.time,
        "date": row.day_rec,
        "prepayment": float(row.prepayment) if row.prepayment is not None else None,
        "prepayment_display": _format_prepayment(float(row.prepayment) if row.prepayment is not None else None),
    }


async def generate_schedule_lines(
    year: int,
    month: int,
    schedule_repo: ScheduleRepository,
    client_repo: ClientRepository,
    slots_override: dict[int, list[str]] | None = None,
) -> list[str]:
    selected = sorted(await schedule_repo.get_selected_days(year, month))
    if not selected:
        return []
    slots_map = DEFAULT_SLOTS.copy()
    stored_slots = await schedule_repo.get_slots()
    if stored_slots:
        slots_map.update(stored_slots)
    if slots_override:
        normalized = _normalize_slots_payload(slots_override)
        if normalized:
            slots_map.update(normalized)
    lines = [f"Расписание за {MONTHS_RU_GEN[month - 1]}:", ""]
    for day in selected:
        ymd = f"{year}-{month:02d}-{day:02d}"
        dt = datetime.strptime(ymd, "%Y-%m-%d")
        wd = dt.weekday()
        slots = slots_map.get(wd, [])
        if not slots:
            continue
        booked = {normalize_time_to_hhmm(row.time) for row in await client_repo.get_by_day(ymd)}
        human_date = dt.strftime("%d.%m")
        wd_short = WEEKDAYS_RU_SHORT[wd]
        booked_norm = {normalize_time_to_hhmm(t) for t in booked if normalize_time_to_hhmm(t)}
        booked_minutes = { _hhmm_to_minutes(t) for t in booked_norm if _hhmm_to_minutes(t) >= 0 }

        slot_flags: dict[str, bool] = {}
        for t in slots:
            raw = str(t)
            starred = raw.endswith("*")
            base = _strip_star(raw)
            slot_flags[base] = starred or slot_flags.get(base, False)

        candidate_times = set(booked_norm) | set(slot_flags.keys())
        candidate_sorted = sorted(candidate_times, key=_hhmm_to_minutes)

        slot_texts: list[str] = []
        for hhmm in candidate_sorted:
            disp = _format_hhmm_with_dot(hhmm)
            if slot_flags.get(hhmm):
                disp = f"{disp}*"
            tmin = _hhmm_to_minutes(hhmm)
            if hhmm in booked_norm:
                slot_texts.append(f"<s>{disp}</s>")
                continue
            too_close = any(abs(tmin - bm) <= 90 for bm in booked_minutes)
            if not too_close:
                slot_texts.append(disp)
        lines.append(f"{human_date} ({wd_short}) " + " ".join(slot_texts))
        lines.append("")
    return lines
