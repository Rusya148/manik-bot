from aiogram import types
from aiogram.dispatcher import Dispatcher

from app.bot.keyboards import kb_start


async def start(message: types.Message):
    await message.answer("Привет! Выберите действие:", reply_markup=kb_start)


async def myid(message: types.Message):
    await message.answer(f"Ваш Telegram ID: {message.from_user.id}")


def register_handlers(dp: Dispatcher):
    dp.register_message_handler(start, commands="start")
    dp.register_message_handler(myid, commands="myid")
