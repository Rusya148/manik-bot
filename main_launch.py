from aiogram import executor

from bot.bot import *
from bot.register_dp import *


if __name__ == '__main__':
    register(dp)
    async def on_startup(dp):
        # На всякий случай удаляем вебхук, если он был установлен где-то
        await bot.delete_webhook(drop_pending_updates=True)
    executor.start_polling(dp, skip_updates=True, on_startup=on_startup)