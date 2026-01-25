from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models_public import User
from app.db.tenant import create_tenant_schema, schema_for_user
from app.repositories.access import AccessRepository
from app.repositories.admins import AdminRepository
from app.repositories.users import UserRepository


class AccessService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.users = UserRepository(session)
        self.access = AccessRepository(session)
        self.admins = AdminRepository(session)

    async def ensure_user(self, tg_id: int, username: str | None, first: str | None, last: str | None) -> User:
        return await self.users.create_or_update(tg_id, username, first, last)

    async def is_admin(self, user_id: int) -> bool:
        return await self.admins.is_admin(user_id)

    async def has_access(self, user_id: int) -> bool:
        if await self.admins.is_admin(user_id):
            return True
        return await self.access.get_active_access(user_id) is not None

    async def grant_access(self, user: User, granted_by: int | None) -> str:
        await self.access.grant(user.id, granted_by)
        schema_name = user.schema_name or schema_for_user(user.tg_id)
        await create_tenant_schema(schema_name)
        await self.users.set_schema(user, schema_name)
        return schema_name

    async def revoke_access(self, user_id: int) -> bool:
        return await self.access.revoke(user_id)
