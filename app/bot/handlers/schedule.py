from datetime import date

from aiogram import types
from aiogram.dispatcher import Dispatcher

from app.bot.keyboards import get_schedule_calendar_keyboard, months_ru
from app.bot.states import ScheduleForm
from app.bot.utils import get_tenant_session_for_schema, get_user_schema
from app.repositories.clients import ClientRepository
from app.repositories.schedule import ScheduleRepository
from app.services.schedule import generate_schedule_lines


def _shift_month(year: int, month: int, delta: int):
    m = month + delta
    y = year + (m - 1) // 12
    m = ((m - 1) % 12) + 1
    return y, m


async def open_schedule(message: types.Message, state):
    today = date.today()
    schema = await get_user_schema(
        message.from_user.id,
        message.from_user.username,
        message.from_user.first_name,
        message.from_user.last_name,
    )
    session = get_tenant_session_for_schema(schema)
    try:
        schedule_repo = ScheduleRepository(session)
        client_repo = ClientRepository(session)
        selected_days = await schedule_repo.get_selected_days(today.year, today.month)
        marked = await client_repo.get_marked_days(today.year, today.month)
        await session.commit()
    finally:
        await session.close()
    kb = get_schedule_calendar_keyboard(today.year, today.month, marked_days=marked, selected_days=selected_days)
    await state.update_data(schedule_year=today.year, schedule_month=today.month)
    await message.answer(
        f"Выберите дни для расписания: {months_ru[today.month - 1]} {today.year}", reply_markup=kb
    )
    await ScheduleForm.selecting_days.set()


async def schedule_nav(callback_query: types.CallbackQuery, state):
    data = await state.get_data()
    year = int(data.get("schedule_year"))
    month = int(data.get("schedule_month"))
    try:
        _, kind, y, m = callback_query.data.split("_")
        y = int(y)
        m = int(m)
        delta = -1 if kind == "prev" else 1
        year, month = _shift_month(y, m, delta)
        schema = await get_user_schema(
            callback_query.from_user.id,
            callback_query.from_user.username,
            callback_query.from_user.first_name,
            callback_query.from_user.last_name,
        )
        session = get_tenant_session_for_schema(schema)
        try:
            schedule_repo = ScheduleRepository(session)
            client_repo = ClientRepository(session)
            selected = await schedule_repo.get_selected_days(year, month)
            marked = await client_repo.get_marked_days(year, month)
            await session.commit()
        finally:
            await session.close()
        kb = get_schedule_calendar_keyboard(year, month, marked_days=marked, selected_days=selected)
        await callback_query.message.edit_text(f"Выберите дни для расписания: {months_ru[month - 1]} {year}")
        await callback_query.message.edit_reply_markup(reply_markup=kb)
        await state.update_data(schedule_year=year, schedule_month=month)
        await callback_query.answer()
    except Exception:
        await callback_query.answer("Не удалось листать календарь")


async def toggle_day(callback_query: types.CallbackQuery, state):
    try:
        _, _, ymd = callback_query.data.split("_", 2)
        y, m, d = ymd.split("-")
        year = int(y)
        month = int(m)
        d_int = int(d)
        schema = await get_user_schema(
            callback_query.from_user.id,
            callback_query.from_user.username,
            callback_query.from_user.first_name,
            callback_query.from_user.last_name,
        )
        session = get_tenant_session_for_schema(schema)
        try:
            schedule_repo = ScheduleRepository(session)
            client_repo = ClientRepository(session)
            selected_now = await schedule_repo.toggle_day(year, month, d_int)
            selected = await schedule_repo.get_selected_days(year, month)
            marked = await client_repo.get_marked_days(year, month)
            await session.commit()
        finally:
            await session.close()
        kb = get_schedule_calendar_keyboard(year, month, marked_days=marked, selected_days=selected)
        await callback_query.message.edit_reply_markup(reply_markup=kb)
        await state.update_data(schedule_year=year, schedule_month=month)
        await callback_query.answer("Выбрано" if selected_now else "Снято")
    except Exception:
        await callback_query.answer("Ошибка выбора дня")


async def generate_schedule(callback_query: types.CallbackQuery, state):
    data = await state.get_data()
    year = int(data.get("schedule_year"))
    month = int(data.get("schedule_month"))
    schema = await get_user_schema(
        callback_query.from_user.id,
        callback_query.from_user.username,
        callback_query.from_user.first_name,
        callback_query.from_user.last_name,
    )
    session = get_tenant_session_for_schema(schema)
    try:
        schedule_repo = ScheduleRepository(session)
        client_repo = ClientRepository(session)
        lines = await generate_schedule_lines(year, month, schedule_repo, client_repo)
        await session.commit()
    finally:
        await session.close()
    if not lines:
        await callback_query.answer("Не выбраны дни")
        return
    await callback_query.message.answer("\n".join(lines).rstrip(), parse_mode="HTML")
    await callback_query.answer("Готово")
    await state.finish()


async def schedule_exit(callback_query: types.CallbackQuery, state):
    try:
        await state.finish()
        await callback_query.message.answer("Вы вышли из режима расписания.")
        await callback_query.answer()
    except Exception:
        await callback_query.answer()


def register_schedule(dp: Dispatcher):
    dp.register_message_handler(open_schedule, text="Расписание")
    dp.register_callback_query_handler(schedule_nav, text_startswith="sch_prev_", state=ScheduleForm.selecting_days)
    dp.register_callback_query_handler(schedule_nav, text_startswith="sch_next_", state=ScheduleForm.selecting_days)
    dp.register_callback_query_handler(toggle_day, text_startswith="sch_day_", state=ScheduleForm.selecting_days)
    dp.register_callback_query_handler(
        generate_schedule, text_startswith="sch_generate_", state=ScheduleForm.selecting_days
    )
    dp.register_callback_query_handler(schedule_exit, text="sch_exit", state=ScheduleForm.selecting_days)
