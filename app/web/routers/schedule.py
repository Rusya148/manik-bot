from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.clients import ClientRepository
from app.repositories.schedule import ScheduleRepository
from app.services.schedule import DEFAULT_SLOTS, generate_schedule_lines, normalize_time_to_hhmm
from app.web.deps import get_tenant_session_for_user


router = APIRouter()


class ScheduleToggle(BaseModel):
    year: int
    month: int
    day: int


class ScheduleGenerateRequest(BaseModel):
    slots: dict | None = None


class ScheduleSlotsUpdate(BaseModel):
    slots: dict | None = None


@router.get("/schedule/selected")
async def schedule_selected(
    year: int,
    month: int,
    session: AsyncSession = Depends(get_tenant_session_for_user),
):
    repo = ScheduleRepository(session)
    return {"days": sorted(await repo.get_selected_days(year, month))}


@router.post("/schedule/toggle")
async def schedule_toggle(
    payload: ScheduleToggle,
    session: AsyncSession = Depends(get_tenant_session_for_user),
):
    repo = ScheduleRepository(session)
    selected = await repo.toggle_day(payload.year, payload.month, payload.day)
    return {"selected": selected, "days": sorted(await repo.get_selected_days(payload.year, payload.month))}


@router.post("/schedule/generate")
async def schedule_generate(
    year: int,
    month: int,
    payload: ScheduleGenerateRequest | None = None,
    session: AsyncSession = Depends(get_tenant_session_for_user),
):
    repo = ScheduleRepository(session)
    client_repo = ClientRepository(session)
    lines = await generate_schedule_lines(year, month, repo, client_repo, payload.slots if payload else None)
    return {"lines": lines}


@router.get("/schedule/slots")
async def schedule_slots_get(
    session: AsyncSession = Depends(get_tenant_session_for_user),
):
    repo = ScheduleRepository(session)
    stored = await repo.get_slots()
    slots = {k: ", ".join(v) for k, v in stored.items()}
    return {"slots": slots}


@router.post("/schedule/slots")
async def schedule_slots_update(
    payload: ScheduleSlotsUpdate,
    session: AsyncSession = Depends(get_tenant_session_for_user),
):
    if not payload or not payload.slots:
        raise HTTPException(status_code=400, detail="Slots required")
    cleaned: dict[int, list[str]] = {}
    for key, value in payload.slots.items():
        try:
            weekday = int(key)
        except Exception:
            continue
        if isinstance(value, str):
            parts = [s.strip() for s in value.split(",") if s.strip()]
        elif isinstance(value, list):
            parts = [str(s).strip() for s in value if str(s).strip()]
        else:
            parts = []
        normalized = []
        for item in parts:
            raw = str(item).strip()
            starred = raw.endswith("*")
            base = raw.replace("*", "").strip()
            norm = normalize_time_to_hhmm(base)
            if not norm:
                continue
            normalized.append(f"{norm}*" if starred else norm)
        if normalized:
            cleaned[weekday] = normalized
    if not cleaned:
        raise HTTPException(status_code=400, detail="Invalid slots")
    repo = ScheduleRepository(session)
    await repo.save_slots(cleaned)
    return {"status": "ok", "slots": {k: ", ".join(v) for k, v in cleaned.items()}}


@router.post("/schedule/slots/reset")
async def schedule_slots_reset(
    session: AsyncSession = Depends(get_tenant_session_for_user),
):
    repo = ScheduleRepository(session)
    await repo.clear_slots()
    return {"status": "ok", "slots": {k: ", ".join(v) for k, v in DEFAULT_SLOTS.items()}}
