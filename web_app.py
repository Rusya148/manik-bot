import os
from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from database.database import (
    add_expenses_to_db,
    add_salary_to_db,
    count_visits_by_link,
    delete_client_by_id,
    get_top_visits,
    get_total_expenses_for_month,
    get_total_salary_for_month,
    remove_last_expenses_from_db,
    remove_last_salary_from_db,
    save_client,
    update_client_by_id,
)
from database.delete_client import delete_client
from database.request_for_date import (
    get_clients_by_date_range,
    get_clients_by_day,
    get_marked_days_for_month,
)
from database.schedule_db import (
    clear_schedule_slots,
    get_schedule_slots,
    get_selected_days,
    save_schedule_slots,
    toggle_day,
)


app = FastAPI(title="Manik Bot Web API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "web", "assets")
INDEX_PATH = os.path.join(BASE_DIR, "web", "index.html")

app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


def _format_prepayment(value) -> str:
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


def _normalize_date(value: str) -> str:
    if not value:
        raise ValueError("empty date")
    value = value.strip()
    if "." in value:
        try:
            dt = datetime.strptime(value, "%d.%m.%Y")
            return dt.strftime("%Y-%m-%d")
        except Exception as exc:
            raise ValueError("invalid date") from exc
    try:
        dt = datetime.strptime(value, "%Y-%m-%d")
        return dt.strftime("%Y-%m-%d")
    except Exception as exc:
        raise ValueError("invalid date") from exc


def _normalize_time_to_hhmm(value: str) -> str:
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


DEFAULT_SLOTS = {
    0: ["11:00", "14:00", "17:00", "19:00"],
    1: ["11:00", "14:00", "17:00", "19:00"],
    2: ["11:00", "14:00", "17:00", "19:00"],
    3: ["11:00", "14:00", "17:00", "19:00"],
    4: ["11:00", "14:00", "17:00", "19:00"],
    5: ["10:00", "13:00", "16:00", "18:00"],
    6: ["10:00", "13:00", "16:00", "18:00"],
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


class ClientCreate(BaseModel):
    name: str
    link: str
    time: str
    date: str
    prepayment: Optional[float] = 0


class SalaryCreate(BaseModel):
    amount: int
    month: str


class ExpensesCreate(BaseModel):
    amount: int
    month: str


class ScheduleToggle(BaseModel):
    year: int
    month: int
    day: int


class ScheduleGenerateRequest(BaseModel):
    slots: Optional[dict] = None


class ScheduleSlotsUpdate(BaseModel):
    slots: Optional[dict] = None


@app.get("/")
def root():
    return FileResponse(INDEX_PATH)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/clients")
def clients_range(
    start: str = Query(..., description="YYYY-MM-DD"),
    end: str = Query(..., description="YYYY-MM-DD"),
):
    rows = get_clients_by_date_range(start, end)
    return [_serialize_client(row) for row in rows]


@app.get("/api/clients/day")
def clients_day(date_iso: str = Query(..., description="YYYY-MM-DD")):
    rows = get_clients_by_day(date_iso)
    return [_serialize_client(row) for row in rows]


@app.get("/api/clients/marked-days")
def marked_days(year: int, month: int):
    return {"days": sorted(get_marked_days_for_month(year, month))}


@app.post("/api/clients")
def create_client(payload: ClientCreate):
    try:
        day_rec = _normalize_date(payload.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    time_norm = _normalize_time_to_hhmm(payload.time)
    if not time_norm:
        raise HTTPException(status_code=400, detail="Invalid time format")
    prepayment = payload.prepayment if payload.prepayment is not None else 0
    save_client(payload.name.strip(), payload.link.strip(), time_norm, day_rec, prepayment)
    return {"status": "ok"}


@app.put("/api/clients/{client_id}")
def update_client(client_id: int, payload: ClientCreate):
    try:
        day_rec = _normalize_date(payload.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    time_norm = _normalize_time_to_hhmm(payload.time)
    if not time_norm:
        raise HTTPException(status_code=400, detail="Invalid time format")
    prepayment = payload.prepayment if payload.prepayment is not None else 0
    updated = update_client_by_id(
        client_id,
        payload.name.strip(),
        payload.link.strip(),
        time_norm,
        day_rec,
        prepayment,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"status": "ok"}


@app.delete("/api/clients/by-link")
def delete_client_by_link(link: str = Query(..., min_length=1)):
    deleted = delete_client(link)
    if not deleted:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"status": "ok"}


@app.delete("/api/clients/{client_id}")
def delete_client_endpoint(client_id: int):
    deleted = delete_client_by_id(client_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"status": "ok"}


@app.get("/api/salary")
def salary_total(month: str = Query(..., description="YYYY-MM")):
    return {"month": month, "total": get_total_salary_for_month(month)}


@app.post("/api/salary")
def salary_add(payload: SalaryCreate):
    add_salary_to_db(payload.amount, payload.month)
    return {"status": "ok", "total": get_total_salary_for_month(payload.month)}


@app.delete("/api/salary/last")
def salary_remove_last(month: str = Query(..., description="YYYY-MM")):
    remove_last_salary_from_db(month)
    return {"status": "ok", "total": get_total_salary_for_month(month)}


@app.get("/api/expenses")
def expenses_total(month: str = Query(..., description="YYYY-MM")):
    return {"month": month, "total": get_total_expenses_for_month(month)}


@app.post("/api/expenses")
def expenses_add(payload: ExpensesCreate):
    add_expenses_to_db(payload.amount, payload.month)
    return {"status": "ok", "total": get_total_expenses_for_month(payload.month)}


@app.delete("/api/expenses/last")
def expenses_remove_last(month: str = Query(..., description="YYYY-MM")):
    remove_last_expenses_from_db(month)
    return {"status": "ok", "total": get_total_expenses_for_month(month)}


@app.get("/api/visits")
def visits_count(link: str = Query(..., min_length=1)):
    count, display = count_visits_by_link(link)
    return {"link": display, "count": count}


@app.get("/api/visits/top")
def visits_top(limit: int = Query(10, ge=1, le=100)):
    items = get_top_visits(limit)
    return {"items": [{"link": link, "count": count} for link, count in items]}


@app.get("/api/schedule/selected")
def schedule_selected(year: int, month: int):
    return {"days": sorted(get_selected_days(year, month))}


@app.post("/api/schedule/toggle")
def schedule_toggle(payload: ScheduleToggle):
    selected = toggle_day(payload.year, payload.month, payload.day)
    return {"selected": selected, "days": sorted(get_selected_days(payload.year, payload.month))}


@app.post("/api/schedule/generate")
def schedule_generate(year: int, month: int, payload: ScheduleGenerateRequest = None):
    selected = sorted(get_selected_days(year, month))
    if not selected:
        return {"lines": []}
    slots_override = DEFAULT_SLOTS
    stored_slots = get_schedule_slots()
    if stored_slots:
        slots_override = {**DEFAULT_SLOTS, **stored_slots}
    if payload and payload.slots:
        normalized = _normalize_slots_payload(payload.slots)
        if normalized:
            slots_override = {**slots_override, **normalized}
    lines = [f"Расписание за {MONTHS_RU_GEN[month - 1]}:", ""]
    for day in selected:
        ymd = f"{year}-{month:02d}-{day:02d}"
        dt = datetime.strptime(ymd, "%Y-%m-%d")
        wd = dt.weekday()
        slots = slots_override.get(wd, [])
        if not slots:
            continue
        booked = {_normalize_time_to_hhmm(row[3]) for row in get_clients_by_day(ymd)}
        human_date = dt.strftime("%d.%m")
        wd_short = WEEKDAYS_RU_SHORT[wd]
        booked_norm = {_normalize_time_to_hhmm(t) for t in booked if _normalize_time_to_hhmm(t)}
        booked_minutes = {_hhmm_to_minutes(t) for t in booked_norm if _hhmm_to_minutes(t) >= 0}

        candidate_times = set(slots) | set(booked_norm)
        candidate_sorted = sorted(candidate_times, key=lambda t: _hhmm_to_minutes(t))

        slot_texts: List[str] = []
        for hhmm in candidate_sorted:
            disp = _format_hhmm_with_dot(hhmm)
            tmin = _hhmm_to_minutes(hhmm)
            if hhmm in booked_norm:
                slot_texts.append(f"<s>{disp}</s>")
                continue
            too_close = any(abs(tmin - bm) <= 90 for bm in booked_minutes)
            if not too_close:
                slot_texts.append(disp)
        lines.append(f"{human_date} ({wd_short}) " + " ".join(slot_texts))
        lines.append("")
    return {"lines": lines}


@app.get("/api/schedule/slots")
def schedule_slots_get():
    stored = get_schedule_slots()
    slots = {k: ", ".join(v) for k, v in stored.items()}
    return {"slots": slots}


@app.post("/api/schedule/slots")
def schedule_slots_update(payload: ScheduleSlotsUpdate):
    if not payload or not payload.slots:
        raise HTTPException(status_code=400, detail="Slots required")
    normalized = _normalize_slots_payload(payload.slots)
    if not normalized:
        raise HTTPException(status_code=400, detail="Invalid slots")
    save_schedule_slots(normalized)
    return {"status": "ok", "slots": {k: ", ".join(v) for k, v in normalized.items()}}


@app.post("/api/schedule/slots/reset")
def schedule_slots_reset():
    clear_schedule_slots()
    return {"status": "ok", "slots": {k: ", ".join(v) for k, v in DEFAULT_SLOTS.items()}}


def _serialize_client(row):
    return {
        "id": row[0],
        "name": row[1],
        "link": row[2],
        "time": row[3],
        "date": row[4],
        "prepayment": row[5] if len(row) > 5 else None,
        "prepayment_display": _format_prepayment(row[5] if len(row) > 5 else None),
    }


def _normalize_slots_payload(raw_slots: dict) -> dict:
    normalized = {}
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
        cleaned = [_normalize_time_to_hhmm(t) for t in parts]
        cleaned = [t for t in cleaned if t]
        if cleaned:
            normalized[weekday] = cleaned
    return normalized
