from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.admins import AdminRepository


class AdminService:
    def __init__(self, session: AsyncSession):
        self.admins = AdminRepository(session)

    async def promote(self, user_id: int, granted_by: int | None) -> None:
        await self.admins.promote(user_id, granted_by)

    async def demote(self, user_id: int) -> bool:
        return await self.admins.demote(user_id)

    async def is_admin(self, user_id: int) -> bool:
        return await self.admins.is_admin(user_id)
