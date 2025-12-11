from aiogram import types
from aiogram.dispatcher import Dispatcher
from datetime import date, datetime

from keyboards.keyboards import get_schedule_calendar_keyboard, months_ru
from states.states import ScheduleForm
from database.request_for_date import get_marked_days_for_month, get_clients_by_day
from database.schedule_db import get_selected_days as db_get_selected_days, toggle_day as db_toggle_day


def _shift_month(year: int, month: int, delta: int):
    m = month + delta
    y = year + (m - 1) // 12
    m = ((m - 1) % 12) + 1
    return y, m


def _normalize_time_to_hhmm(value: str) -> str:
    if not value:
        return ""
    t = value.strip().replace(' ', '').replace('.', ':').replace('-', ':').replace('/', ':')
    if ':' not in t:
        t = f"{t}:00"
    parts = t.split(':')
    try:
        hh = int(parts[0])
    except Exception:
        return ""
    mm = int(parts[1]) if len(parts) > 1 and parts[1] != '' else 0
    hh = max(0, min(23, hh))
    mm = 0 if mm < 0 or mm > 59 else mm
    return f"{hh:02d}:{mm:02d}"


def _format_hhmm_with_dot(hhmm: str) -> str:
    if not hhmm:
        return ""
    hh, mm = hhmm.split(':')
    return f"{hh}.{mm}"

def _hhmm_to_minutes(hhmm: str) -> int:
    try:
        hh, mm = hhmm.split(':')
        return int(hh) * 60 + int(mm)
    except Exception:
        return -1


# Базовые слоты по дням недели (0-пн ... 6-вс)
DEFAULT_SLOTS = {
    0: ["11:00", "14:00", "17:00", "19:00"],  # пн
    1: ["11:00", "14:00", "17:00", "19:00"],  # вт
    2: ["11:00", "14:00", "17:00", "19:00"],  # ср
    3: ["11:00", "14:00", "17:00", "19:00"],  # чт
    4: ["11:00", "14:00", "18:00"],           # пт
    5: ["10:00", "13:00", "15:00", "19:00"],  # сб
    6: [],                                    # вс
}

WEEKDAYS_RU_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"]
MONTHS_RU_GEN = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"]


async def open_schedule(message: types.Message, state):
    today = date.today()
    marked = get_marked_days_for_month(today.year, today.month)
    selected_days = db_get_selected_days(today.year, today.month)
    kb = get_schedule_calendar_keyboard(today.year, today.month, marked_days=marked, selected_days=selected_days)
    await state.update_data(schedule_year=today.year, schedule_month=today.month)
    await message.answer(f"Выберите дни для расписания: {months_ru[today.month - 1]} {today.year}", reply_markup=kb)
    await ScheduleForm.selecting_days.set()


async def schedule_nav(callback_query: types.CallbackQuery, state):
    data = await state.get_data()
    year = int(data.get("schedule_year"))
    month = int(data.get("schedule_month"))

    try:
        _, kind, y, m = callback_query.data.split("_")
        y = int(y); m = int(m)
        delta = -1 if kind == "prev" else 1
        year, month = _shift_month(y, m, delta)
        # Получаем выбранные дни из БД для нового месяца
        selected = db_get_selected_days(year, month)
        marked = get_marked_days_for_month(year, month)
        kb = get_schedule_calendar_keyboard(year, month, marked_days=marked, selected_days=selected)
        await callback_query.message.edit_text(f"Выберите дни для расписания: {months_ru[month - 1]} {year}")
        await callback_query.message.edit_reply_markup(reply_markup=kb)
        await state.update_data(schedule_year=year, schedule_month=month)
        await callback_query.answer()
    except Exception:
        await callback_query.answer("Не удалось листать календарь")


async def toggle_day(callback_query: types.CallbackQuery, state):
    data = await state.get_data()
    year = int(data.get("schedule_year"))
    month = int(data.get("schedule_month"))
    try:
        _, _, ymd = callback_query.data.split("_", 2)
        y, m, d = ymd.split("-")
        year = int(y); month = int(m)
        d_int = int(d)
        # Тоггл в БД
        selected_now = db_toggle_day(year, month, d_int)
        selected = db_get_selected_days(year, month)
        marked = get_marked_days_for_month(year, month)
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
    selected = sorted(db_get_selected_days(year, month))

    if not selected:
        await callback_query.answer("Не выбраны дни")
        return

    lines = [f"Расписание за {MONTHS_RU_GEN[month - 1]}:" , "" ]
    for day in selected:
        ymd = f"{year}-{month:02d}-{day:02d}"
        dt = datetime.strptime(ymd, "%Y-%m-%d")
        wd = dt.weekday()  # 0..6
        slots = DEFAULT_SLOTS.get(wd, [])
        if not slots:
            # Пропускаем дни без слотов (например, воскресенье)
            continue
        booked = { _normalize_time_to_hhmm(row[3]) for row in get_clients_by_day(ymd) }
        human_date = dt.strftime("%d.%m")
        wd_short = WEEKDAYS_RU_SHORT[wd]
        # Готовим множество занятых и ближайших к ним слотов (±120 минут)
        booked_norm = {_normalize_time_to_hhmm(t) for t in booked if _normalize_time_to_hhmm(t)}
        booked_minutes = {_hhmm_to_minutes(t) for t in booked_norm if _hhmm_to_minutes(t) >= 0}

        # Кандидаты к показу: объединяем базовые слоты и точные забронированные времена,
        # чтобы всегда отображать забронированные как зачёркнутые, даже если их нет в слотах
        candidate_times = set(slots) | set(booked_norm)
        # Отсортируем по времени
        candidate_sorted = sorted(candidate_times, key=lambda t: _hhmm_to_minutes(t))

        # Формируем строку: точные совпадения — зачёркнуть, слоты в пределах ±120 минут — убрать
        slot_texts = []
        for hhmm in candidate_sorted:
            disp = _format_hhmm_with_dot(hhmm)
            tmin = _hhmm_to_minutes(hhmm)
            if hhmm in booked_norm:
                slot_texts.append(f"<s>{disp}</s>")
                continue
            # Пропускаем слишком близкие к занятым
            too_close = any(abs(tmin - bm) <= 120 for bm in booked_minutes)
            if not too_close:
                slot_texts.append(disp)
        lines.append(f"{human_date} ({wd_short}) " + " ".join(slot_texts))
        lines.append("")  # пустая строка между днями

    await callback_query.message.answer("\n".join(lines).rstrip(), parse_mode="HTML")
    await callback_query.answer("Готово")
    # Выходим из режима выбора расписания
    await state.finish()

async def schedule_exit(callback_query: types.CallbackQuery, state):
    try:
        await state.finish()
        await callback_query.message.answer("Вы вышли из режима расписания.")
        await callback_query.answer()
    except Exception:
        await callback_query.answer()


def register_schedule(dp: Dispatcher):
    dp.register_message_handler(open_schedule, text='Расписание')
    dp.register_callback_query_handler(schedule_nav, text_startswith='sch_prev_', state=ScheduleForm.selecting_days)
    dp.register_callback_query_handler(schedule_nav, text_startswith='sch_next_', state=ScheduleForm.selecting_days)
    dp.register_callback_query_handler(toggle_day, text_startswith='sch_day_', state=ScheduleForm.selecting_days)
    dp.register_callback_query_handler(generate_schedule, text_startswith='sch_generate_', state=ScheduleForm.selecting_days)
    dp.register_callback_query_handler(schedule_exit, text='sch_exit', state=ScheduleForm.selecting_days)


