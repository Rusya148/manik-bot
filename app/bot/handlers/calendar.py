from datetime import date, datetime

from aiogram import types
from aiogram.dispatcher import Dispatcher

from app.bot.keyboards import get_calendar_keyboard, months_ru
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


def _month_shift(year: int, month: int, delta: int):
    m = month + delta
    y = year + (m - 1) // 12
    m = ((m - 1) % 12) + 1
    return y, m


async def open_calendar(message: types.Message):
    today = date.today()
    schema = await get_user_schema(
        message.from_user.id,
        message.from_user.username,
        message.from_user.first_name,
        message.from_user.last_name,
    )
    session = get_tenant_session_for_schema(schema)
    try:
        repo = ClientRepository(session)
        marked = await repo.get_marked_days(today.year, today.month)
        await session.commit()
    finally:
        await session.close()
    kb = get_calendar_keyboard(today.year, today.month, marked)
    await message.answer(f"Календарь: {months_ru[today.month - 1]} {today.year}", reply_markup=kb)


async def calendar_nav(callback_query: types.CallbackQuery):
    try:
        data = callback_query.data
        if data.startswith("cal_today_"):
            today = date.today()
            year = today.year
            month = today.month
        else:
            _, kind, y, m = data.split("_")
            year = int(y)
            month = int(m)
            delta = -1 if kind == "prev" else 1
            year, month = _month_shift(year, month, delta)

        schema = await get_user_schema(
            callback_query.from_user.id,
            callback_query.from_user.username,
            callback_query.from_user.first_name,
            callback_query.from_user.last_name,
        )
        session = get_tenant_session_for_schema(schema)
        try:
            repo = ClientRepository(session)
            marked = await repo.get_marked_days(year, month)
            await session.commit()
        finally:
            await session.close()
        kb = get_calendar_keyboard(year, month, marked)
        await callback_query.message.edit_text(f"Календарь: {months_ru[month - 1]} {year}")
        await callback_query.message.edit_reply_markup(reply_markup=kb)
        if data.startswith("cal_today_"):
            ymd = date.today().isoformat()
            session = get_tenant_session_for_schema(schema)
            try:
                repo = ClientRepository(session)
                clients = await repo.get_by_day(ymd)
                await session.commit()
            finally:
                await session.close()
            if not clients:
                await callback_query.message.answer(
                    f"Записей на {datetime.strptime(ymd, '%Y-%m-%d').strftime('%d.%m.%Y')} нет."
                )
            else:
                lines = [
                    f"Записи на {datetime.strptime(ymd, '%Y-%m-%d').strftime('%d.%m.%Y')}:"
                ]
                for c in clients:
                    prepay_str = _format_prepayment(c.prepayment)
                    if c.link:
                        lines.append(f"{c.time} — {c.name} ({c.link}), предоплата: {prepay_str}")
                    else:
                        lines.append(f"{c.time} — {c.name}, предоплата: {prepay_str}")
                await callback_query.message.answer("\n".join(lines))
        await callback_query.answer()
    except Exception:
        await callback_query.answer("Ошибка обновления календаря")


async def calendar_day(callback_query: types.CallbackQuery):
    try:
        _, _, ymd = callback_query.data.split("_", 2)
        schema = await get_user_schema(
            callback_query.from_user.id,
            callback_query.from_user.username,
            callback_query.from_user.first_name,
            callback_query.from_user.last_name,
        )
        session = get_tenant_session_for_schema(schema)
        try:
            repo = ClientRepository(session)
            clients = await repo.get_by_day(ymd)
            await session.commit()
        finally:
            await session.close()
        if not clients:
            await callback_query.message.answer(
                f"Записей на {datetime.strptime(ymd, '%Y-%m-%d').strftime('%d.%m.%Y')} нет."
            )
            await callback_query.answer()
            return
        lines = [f"Записи на {datetime.strptime(ymd, '%Y-%m-%d').strftime('%d.%m.%Y')}:"]
        for c in clients:
            prepay_str = _format_prepayment(c.prepayment)
            if c.link:
                lines.append(f"{c.time} — {c.name} ({c.link}), предоплата: {prepay_str}")
            else:
                lines.append(f"{c.time} — {c.name}, предоплата: {prepay_str}")
        await callback_query.message.answer("\n".join(lines))
        await callback_query.answer()
    except Exception:
        await callback_query.answer("Ошибка загрузки записей за день")


def register_calendar(dp: Dispatcher):
    dp.register_message_handler(open_calendar, text="Календарь")
    dp.register_callback_query_handler(calendar_nav, text_startswith="cal_prev_")
    dp.register_callback_query_handler(calendar_nav, text_startswith="cal_next_")
    dp.register_callback_query_handler(calendar_nav, text_startswith="cal_today_")
    dp.register_callback_query_handler(calendar_day, text_startswith="cal_day_")
