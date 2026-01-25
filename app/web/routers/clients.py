from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.clients import ClientRepository
from app.services.schedule import normalize_date, normalize_time_to_hhmm, serialize_client
from app.web.deps import get_tenant_session_for_user


router = APIRouter()


class ClientCreate(BaseModel):
    name: str
    link: str
    time: str
    date: str
    prepayment: float | None = 0


@router.get("/clients")
async def clients_range(
    start: str = Query(..., description="YYYY-MM-DD"),
    end: str = Query(..., description="YYYY-MM-DD"),
    session: AsyncSession = Depends(get_tenant_session_for_user),
):
    repo = ClientRepository(session)
    rows = await repo.get_by_date_range(start, end)
    return [serialize_client(row) for row in rows]


@router.get("/clients/day")
async def clients_day(
    date_iso: str = Query(..., description="YYYY-MM-DD"),
    session: AsyncSession = Depends(get_tenant_session_for_user),
):
    repo = ClientRepository(session)
    rows = await repo.get_by_day(date_iso)
    return [serialize_client(row) for row in rows]


@router.get("/clients/marked-days")
async def marked_days(
    year: int,
    month: int,
    session: AsyncSession = Depends(get_tenant_session_for_user),
):
    repo = ClientRepository(session)
    return {"days": sorted(await repo.get_marked_days(year, month))}


@router.post("/clients")
async def create_client(
    payload: ClientCreate,
    session: AsyncSession = Depends(get_tenant_session_for_user),
):
    try:
        day_rec = normalize_date(payload.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    time_norm = normalize_time_to_hhmm(payload.time)
    if not time_norm:
        raise HTTPException(status_code=400, detail="Invalid time format")
    prepayment = payload.prepayment if payload.prepayment is not None else 0
    repo = ClientRepository(session)
    await repo.create(payload.name.strip(), payload.link.strip(), time_norm, day_rec, prepayment)
    return {"status": "ok"}


@router.put("/clients/{client_id}")
async def update_client(
    client_id: int,
    payload: ClientCreate,
    session: AsyncSession = Depends(get_tenant_session_for_user),
):
    try:
        day_rec = normalize_date(payload.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    time_norm = normalize_time_to_hhmm(payload.time)
    if not time_norm:
        raise HTTPException(status_code=400, detail="Invalid time format")
    prepayment = payload.prepayment if payload.prepayment is not None else 0
    repo = ClientRepository(session)
    updated = await repo.update(
        client_id, payload.name.strip(), payload.link.strip(), time_norm, day_rec, prepayment
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"status": "ok"}


@router.delete("/clients/by-link")
async def delete_client_by_link(
    link: str = Query(..., min_length=1),
    session: AsyncSession = Depends(get_tenant_session_for_user),
):
    repo = ClientRepository(session)
    deleted = await repo.delete_by_link(link)
    if not deleted:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"status": "ok"}


@router.delete("/clients/{client_id}")
async def delete_client_endpoint(
    client_id: int,
    session: AsyncSession = Depends(get_tenant_session_for_user),
):
    repo = ClientRepository(session)
    deleted = await repo.delete_by_id(client_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"status": "ok"}
