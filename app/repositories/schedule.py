from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models_tenant import ScheduleDay, ScheduleSlot


class ScheduleRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_selected_days(self, year: int, month: int) -> set[int]:
        result = await self.session.execute(
            select(ScheduleDay.day)
            .where(ScheduleDay.year == year, ScheduleDay.month == month)
            .order_by(ScheduleDay.day.asc())
        )
        return {int(row[0]) for row in result.all()}

    async def toggle_day(self, year: int, month: int, day: int) -> bool:
        selected = await self.get_selected_days(year, month)
        if day in selected:
            await self.session.execute(
                delete(ScheduleDay).where(
                    ScheduleDay.year == year, ScheduleDay.month == month, ScheduleDay.day == day
                )
            )
            return False
        self.session.add(ScheduleDay(year=year, month=month, day=day))
        await self.session.flush()
        return True

    async def get_slots(self) -> dict[int, list[str]]:
        result = await self.session.execute(select(ScheduleSlot).order_by(ScheduleSlot.weekday.asc()))
        slots: dict[int, list[str]] = {}
        for row in result.scalars().all():
            parts = [s.strip() for s in (row.slots or "").split(",") if s.strip()]
            if parts:
                slots[int(row.weekday)] = parts
        return slots

    async def save_slots(self, slots: dict[int, list[str]]) -> None:
        for weekday, values in slots.items():
            text = ", ".join(values) if values else ""
            await self.session.merge(ScheduleSlot(weekday=int(weekday), slots=text))

    async def clear_slots(self) -> None:
        await self.session.execute(delete(ScheduleSlot))
