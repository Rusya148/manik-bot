from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models_public import AdminUser


class AdminRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def is_admin(self, user_id: int) -> bool:
        result = await self.session.execute(
            select(AdminUser.id).where(AdminUser.user_id == user_id).limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def promote(self, user_id: int, granted_by: int | None) -> AdminUser:
        result = await self.session.execute(
            select(AdminUser).where(AdminUser.user_id == user_id).limit(1)
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing
        admin = AdminUser(user_id=user_id, granted_by=granted_by)
        self.session.add(admin)
        await self.session.flush()
        return admin

    async def demote(self, user_id: int) -> bool:
        result = await self.session.execute(
            select(AdminUser).where(AdminUser.user_id == user_id).limit(1)
        )
        existing = result.scalar_one_or_none()
        if not existing:
            return False
        await self.session.delete(existing)
        return True
