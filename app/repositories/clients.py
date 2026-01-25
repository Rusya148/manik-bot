from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models_tenant import Client


class ClientRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, name: str, link: str, time: str, day_rec: str, prepayment: float) -> Client:
        client = Client(name=name, link=link, time=time, day_rec=day_rec, prepayment=prepayment)
        self.session.add(client)
        await self.session.flush()
        return client

    async def update(
        self, client_id: int, name: str, link: str, time: str, day_rec: str, prepayment: float
    ) -> bool:
        result = await self.session.execute(
            update(Client)
            .where(Client.id == client_id)
            .values(name=name, link=link, time=time, day_rec=day_rec, prepayment=prepayment)
        )
        return result.rowcount > 0

    async def delete_by_id(self, client_id: int) -> bool:
        result = await self.session.execute(delete(Client).where(Client.id == client_id))
        return result.rowcount > 0

    async def delete_by_link(self, link: str) -> bool:
        result = await self.session.execute(delete(Client).where(Client.link == link))
        return result.rowcount > 0

    async def get_by_date_range(self, start_date: str, end_date: str) -> list[Client]:
        result = await self.session.execute(
            select(Client)
            .where(Client.day_rec >= start_date, Client.day_rec <= end_date)
            .order_by(Client.day_rec.asc())
        )
        return list(result.scalars().all())

    async def get_by_day(self, day_iso: str) -> list[Client]:
        result = await self.session.execute(
            select(Client).where(Client.day_rec == day_iso).order_by(Client.time.asc())
        )
        return list(result.scalars().all())

    async def get_marked_days(self, year: int, month: int) -> set[int]:
        start = f"{year:04d}-{month:02d}-01"
        end_month = month + 1
        end_year = year + (end_month - 1) // 12
        end_month = ((end_month - 1) % 12) + 1
        end = f"{end_year:04d}-{end_month:02d}-01"
        result = await self.session.execute(
            select(Client.day_rec).where(Client.day_rec >= start, Client.day_rec < end)
        )
        days = {int(day.split("-")[2]) for day in result.scalars().all()}
        return days
