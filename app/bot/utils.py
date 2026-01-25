from app.db.session import get_async_session, get_tenant_session
from app.db.tenant import create_tenant_schema, schema_for_user
from app.repositories.users import UserRepository
from app.services.access import AccessService


async def get_user_schema(
    tg_id: int,
    username: str | None,
    first_name: str | None,
    last_name: str | None,
) -> str:
    session = get_async_session()
    try:
        access_service = AccessService(session)
        user = await access_service.ensure_user(tg_id, username, first_name, last_name)
        if not user.schema_name:
            schema_name = schema_for_user(user.tg_id)
            await create_tenant_schema(schema_name)
            repo = UserRepository(session)
            await repo.set_schema(user, schema_name)
            await session.commit()
            return schema_name
        await session.commit()
        return user.schema_name
    finally:
        await session.close()


def get_tenant_session_for_schema(schema_name: str):
    return get_tenant_session(schema_name)
