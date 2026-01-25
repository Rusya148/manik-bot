from collections import defaultdict
from datetime import datetime, timedelta

from aiogram import types, Dispatcher
from aiogram.types import CallbackQuery

from app.bot.keyboards import kb_registered_client
from app.bot.utils import get_tenant_session_for_schema, get_user_schema
from app.repositories.clients import ClientRepository


def _format_prepayment(value):
    if value is None:
        return "✗"
    try:
        num = float(value)
    except Exception:
        return "✗"
    if num == 0:
        return "✗"
    if num == 1:
        return "✓"
    return f"{num:.2f}".rstrip("0").rstrip(".")


def _parse_time_to_minutes(value: str) -> int:
    try:
        if not value:
            return 24 * 60 + 1
        cleaned = value.strip().replace(" ", "")
        for sep in [".", "-", "/"]:
            cleaned = cleaned.replace(sep, ":")
        if ":" in cleaned:
            parts = cleaned.split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 and parts[1] != "" else 0
        else:
            hour = int(cleaned)
            minute = 0
        if hour < 0 or hour > 23 or minute < 0 or minute > 59:
            return 24 * 60 + 1
        return hour * 60 + minute
    except Exception:
        return 24 * 60 + 1


async def format_clients_message(clients):
    if not clients:
        return "Нет клиентов на выбранный период."

    clients_by_day = defaultdict(list)
    for client in clients:
        client_date = datetime.strptime(client.day_rec, "%Y-%m-%d")
        formatted_date = client_date.strftime("%d.%m.%Y")
        clients_by_day[formatted_date].append(client)

    message = ""
    for formatted_date, items in clients_by_day.items():
        message += f"——————————————\n<b>Дата: {formatted_date}</b>\n"
        clients_sorted = sorted(items, key=lambda c: _parse_time_to_minutes(c.time))
        for client in clients_sorted:
            prepayment_str = _format_prepayment(client.prepayment)
            message += (
                f"{client.name}, {client.link},\n"
                f"Время записи: {client.time}\n"
                f"Предоплата: {prepayment_str}\n\n"
            )
    return message


async def clients_date(message: types.Message):
    await message.answer("На какой период показать записи?", reply_markup=kb_registered_client)


async def _fetch_clients(message_or_query, start: str, end: str) -> list:
    schema = await get_user_schema(
        message_or_query.from_user.id,
        message_or_query.from_user.username,
        message_or_query.from_user.first_name,
        message_or_query.from_user.last_name,
    )
    session = get_tenant_session_for_schema(schema)
    try:
        repo = ClientRepository(session)
        clients = await repo.get_by_date_range(start, end)
        await session.commit()
        return clients
    finally:
        await session.close()


async def client_today(callback_query: CallbackQuery):
    today = datetime.now().strftime("%Y-%m-%d")
    try:
        clients_today = await _fetch_clients(callback_query, today, today)
        message = await format_clients_message(clients_today)
        await callback_query.message.answer(f"Клиенты на сегодня:\n{message}", parse_mode="HTML")
    except Exception as e:
        await callback_query.message.answer(f"Произошла ошибка при получении данных: {e}")


async def client_week(callback_query: CallbackQuery):
    today = datetime.now().strftime("%Y-%m-%d")
    next_7_days = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    try:
        clients_next_7_days = await _fetch_clients(callback_query, today, next_7_days)
        message = await format_clients_message(clients_next_7_days)
        await callback_query.message.answer(f"Клиенты на неделю:\n{message}", parse_mode="HTML")
    except Exception as e:
        await callback_query.message.answer(f"Произошла ошибка при получении данных: {e}")


async def client_month(callback_query: CallbackQuery):
    today = datetime.now().strftime("%Y-%m-%d")
    next_365_days = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
    try:
        clients_this_month = await _fetch_clients(callback_query, today, next_365_days)
        message = await format_clients_message(clients_this_month)
        await callback_query.message.answer(f"Клиенты за весь период:\n{message}", parse_mode="HTML")
    except Exception as e:
        await callback_query.message.answer(f"Произошла ошибка при получении данных: {e}")


def register_handlers(dp: Dispatcher):
    dp.register_message_handler(clients_date, text="Клиенты")
    dp.register_callback_query_handler(client_today, text="clients_today")
    dp.register_callback_query_handler(client_week, text="clients_week")
    dp.register_callback_query_handler(client_month, text="clients_month")
