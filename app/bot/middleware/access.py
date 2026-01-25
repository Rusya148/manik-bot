from aiogram import types
from aiogram.dispatcher.handler import CancelHandler
from aiogram.dispatcher.middlewares import BaseMiddleware

from app.db.session import get_async_session
from app.services.access import AccessService


class AccessMiddleware(BaseMiddleware):
    async def on_pre_process_message(self, message: types.Message, data: dict):
        if not message.from_user:
            return
        session = get_async_session()
        try:
            service = AccessService(session)
            user = await service.ensure_user(
                message.from_user.id,
                message.from_user.username,
                message.from_user.first_name,
                message.from_user.last_name,
            )
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
            user = await service.ensure_user(
                callback_query.from_user.id,
                callback_query.from_user.username,
                callback_query.from_user.first_name,
                callback_query.from_user.last_name,
            )
            if not await service.has_access(user.id):
                await callback_query.answer("Доступ запрещён", show_alert=True)
                raise CancelHandler()
            await session.commit()
        finally:
            await session.close()
