from aiogram import types
from aiogram.dispatcher import Dispatcher
from keyboards.keyboards import kb_start
AUTHORIZED_USERS = ['424966792', '440813374']

async def start(message: types.Message):
    if message.from_user.id != 424966792 and message.from_user.id != 440813374:
        await message.answer('Вы не авторизованы для использования этой команды.')
        return

    await message.answer('ky', reply_markup=kb_start)



def register_handlers(dp: Dispatcher):
    dp.register_message_handler(start, commands="start")