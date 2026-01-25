import json

from fastapi import APIRouter, Header, HTTPException

from app.config import settings
from app.db.session import get_async_session
from app.services.access import AccessService
from app.utils.telegram import verify_init_data


router = APIRouter()


@router.get("/access")
async def access_status(x_telegram_init_data: str | None = Header(default=None)):
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Missing init data")
    try:
        data = verify_init_data(x_telegram_init_data, settings.bot_token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid init data")
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

    session = get_async_session()
    try:
        access_service = AccessService(session)
        user = await access_service.ensure_user(tg_id, username, first_name, last_name)
        is_admin = await access_service.is_admin(user.id)
        access = await access_service.has_access(user.id)
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()

    return {"access": access, "is_admin": is_admin}
