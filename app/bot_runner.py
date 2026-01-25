import asyncio

from aiogram import Bot, Dispatcher
from aiogram.contrib.fsm_storage.memory import MemoryStorage
from aiogram.utils import executor

from app.bot.middleware.access import AccessMiddleware
from app.bot.register import register
from app.config import settings
from app.db.session import get_async_session
from app.services.bootstrap import ensure_admins


bot = Bot(token=settings.bot_token, parse_mode="HTML")
dp = Dispatcher(bot, storage=MemoryStorage())
dp.middleware.setup(AccessMiddleware())


async def on_startup(dp: Dispatcher):
    session = get_async_session()
    try:
        await ensure_admins(session)
        await session.commit()
    finally:
        await session.close()
    await bot.delete_webhook(drop_pending_updates=True)


def main():
    register(dp)
    executor.start_polling(dp, skip_updates=True, on_startup=on_startup)


if __name__ == "__main__":
    main()
