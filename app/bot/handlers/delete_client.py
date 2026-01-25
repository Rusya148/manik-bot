from aiogram.types import Message
from aiogram.dispatcher import Dispatcher

from app.bot.keyboards import kb_exit_delete
from app.bot.states import DeleteForm
from app.bot.utils import get_tenant_session_for_schema, get_user_schema
from app.repositories.clients import ClientRepository


async def delete_client_text(message: Message):
    await message.answer("Какого клиента вы хотите удалить?\nВведите ссылку на него:", reply_markup=kb_exit_delete)
    await DeleteForm.waiting_for_delete.set()


async def handle_delete_client_link(message: Message, state):
    client_link = message.text.strip()
    schema = await get_user_schema(
        message.from_user.id,
        message.from_user.username,
        message.from_user.first_name,
        message.from_user.last_name,
    )
    session = get_tenant_session_for_schema(schema)
    try:
        repo = ClientRepository(session)
        result = await repo.delete_by_link(client_link)
        await session.commit()
        if result:
            await message.answer("Клиент удален.")
        else:
            await message.answer("Клиент с такой ссылкой не найден или не был удален.")
    except Exception as e:
        await message.answer(f"Произошла ошибка: {e}")
    finally:
        await session.close()
    await state.finish()


def register_delete_client(dp: Dispatcher):
    dp.register_message_handler(delete_client_text, text="Удалить клиента")
    dp.register_message_handler(handle_delete_client_link, state=DeleteForm.waiting_for_delete)
