from aiogram import types
from aiogram.dispatcher import Dispatcher

from app.bot.keyboards import kb_start
from app.db.session import get_async_session
from app.services.access import AccessService


async def start(message: types.Message):
    session = get_async_session()
    try:
        service = AccessService(session)
        await service.ensure_user(
            message.from_user.id,
            message.from_user.username,
            message.from_user.first_name,
            message.from_user.last_name,
        )
        await session.commit()
    finally:
        await session.close()
    await message.answer("Привет! Выберите действие:", reply_markup=kb_start)


async def myid(message: types.Message):
    session = get_async_session()
    try:
        service = AccessService(session)
        await service.ensure_user(
            message.from_user.id,
            message.from_user.username,
            message.from_user.first_name,
            message.from_user.last_name,
        )
        await session.commit()
    finally:
        await session.close()
    await message.answer(f"Ваш Telegram ID: {message.from_user.id}")


def register_handlers(dp: Dispatcher):
    dp.register_message_handler(start, commands="start")
    dp.register_message_handler(myid, commands="myid")
