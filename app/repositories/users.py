from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models_public import User


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_tg_id(self, tg_id: int) -> User | None:
        result = await self.session.execute(select(User).where(User.tg_id == tg_id))
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        if not username:
            return None
        normalized = username.lstrip("@").lower()
        result = await self.session.execute(
            select(User).where(User.username.ilike(normalized)).limit(1)
        )
        return result.scalar_one_or_none()

    async def create_or_update(
        self,
        tg_id: int,
        username: str | None,
        first_name: str | None,
        last_name: str | None,
    ) -> User:
        user = await self.get_by_tg_id(tg_id)
        if user is None:
            user = User(
                tg_id=tg_id,
                username=username,
                first_name=first_name,
                last_name=last_name,
            )
            self.session.add(user)
        else:
            user.username = username
            user.first_name = first_name
            user.last_name = last_name
        await self.session.flush()
        return user

    async def set_schema(self, user: User, schema_name: str) -> None:
        user.schema_name = schema_name
        await self.session.flush()

    async def list_users(self, offset: int, limit: int) -> list[User]:
        result = await self.session.execute(
            select(User).order_by(User.id.asc()).offset(offset).limit(limit)
        )
        return list(result.scalars().all())
