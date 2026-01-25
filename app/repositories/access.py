from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models_public import UserAccess


class AccessRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_active_access(self, user_id: int) -> UserAccess | None:
        result = await self.session.execute(
            select(UserAccess)
            .where(UserAccess.user_id == user_id, UserAccess.revoked_at.is_(None))
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def grant(self, user_id: int, granted_by: int | None) -> UserAccess:
        access = await self.get_active_access(user_id)
        if access:
            return access
        access = UserAccess(user_id=user_id, granted_by=granted_by)
        self.session.add(access)
        await self.session.flush()
        return access

    async def revoke(self, user_id: int) -> bool:
        access = await self.get_active_access(user_id)
        if not access:
            return False
        access.revoked_at = datetime.utcnow()
        await self.session.flush()
        return True
