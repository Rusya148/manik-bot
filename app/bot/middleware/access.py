from aiogram import types
from aiogram.dispatcher.handler import CancelHandler
from aiogram.dispatcher.middlewares import BaseMiddleware

from app.config import settings
from app.db.session import get_async_session
from app.services.access import AccessService
from app.services.admin import AdminService


class AccessMiddleware(BaseMiddleware):
    async def on_pre_process_message(self, message: types.Message, data: dict):
        if not message.from_user:
            return
        if message.text and message.text.startswith(("/start", "/myid")):
            return
        session = get_async_session()
        try:
            service = AccessService(session)
            admin_service = AdminService(session)
            user = await service.ensure_user(
                message.from_user.id,
                message.from_user.username,
                message.from_user.first_name,
                message.from_user.last_name,
            )
            username = (message.from_user.username or "").lower()
            if user.tg_id in settings.admin_ids or username in settings.admin_usernames:
                await admin_service.promote(user.id, user.tg_id)
                await service.grant_access(user, user.tg_id)
                await session.commit()
                return
            if not await service.has_access(user.id):
                await message.answer("Доступ запрещён")
                raise CancelHandler()
            await session.commit()
        finally:
            await session.close()

    async def on_pre_process_callback_query(self, callback_query: types.CallbackQuery, data: dict):
        if not callback_query.from_user:
            return
        session = get_async_session()
        try:
            service = AccessService(session)
            admin_service = AdminService(session)
            user = await service.ensure_user(
                callback_query.from_user.id,
                callback_query.from_user.username,
                callback_query.from_user.first_name,
                callback_query.from_user.last_name,
            )
            username = (callback_query.from_user.username or "").lower()
            if user.tg_id in settings.admin_ids or username in settings.admin_usernames:
                await admin_service.promote(user.id, user.tg_id)
                await service.grant_access(user, user.tg_id)
                await session.commit()
                return
            if not await service.has_access(user.id):
                await callback_query.answer("Доступ запрещён", show_alert=True)
                raise CancelHandler()
            await session.commit()
        finally:
            await session.close()
