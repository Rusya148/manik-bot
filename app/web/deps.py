import json
from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_async_session, get_tenant_session
from app.db.tenant import create_tenant_schema, schema_for_user
from app.repositories.users import UserRepository
from app.services.access import AccessService
from app.utils.telegram import verify_init_data


async def get_public_session() -> AsyncSession:
    session = get_async_session()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()


async def get_current_user(
    init_data: Annotated[str | None, Header(alias="X-Telegram-Init-Data")] = None,
    session: AsyncSession = Depends(get_public_session),
):
    if not init_data:
        raise HTTPException(status_code=401, detail="Missing init data")
    try:
        data = verify_init_data(init_data, settings.bot_token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))

    user_json = data.get("user")
    if not user_json:
        raise HTTPException(status_code=401, detail="User data missing")
    try:
        payload = json.loads(user_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=401, detail="Invalid user payload")
    tg_id = int(payload.get("id"))
    username = payload.get("username")
    first_name = payload.get("first_name")
    last_name = payload.get("last_name")

    access_service = AccessService(session)
    user = await access_service.ensure_user(tg_id, username, first_name, last_name)
    username_norm = (username or "").lower()
    if tg_id in settings.admin_ids or username_norm in settings.admin_usernames:
        await access_service.admins.promote(user.id, tg_id)
        await access_service.grant_access(user, tg_id)
    has_access = await access_service.has_access(user.id)
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    return user


async def get_tenant_session_for_user(
    user=Depends(get_current_user),
):
    if not user.schema_name:
        schema_name = schema_for_user(user.tg_id)
        session = get_async_session()
        try:
            repo = UserRepository(session)
            await create_tenant_schema(schema_name)
            await repo.set_schema(user, schema_name)
            await session.commit()
        finally:
            await session.close()
        user.schema_name = schema_name
    session = get_tenant_session(user.schema_name)
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()
