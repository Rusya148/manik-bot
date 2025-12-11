from aiogram import types
from aiogram.dispatcher import Dispatcher
from datetime import date, datetime
import calendar as pycal

from keyboards.keyboards import get_calendar_keyboard, months_ru
from database.request_for_date import get_marked_days_for_month, get_clients_by_day


def _month_shift(year: int, month: int, delta: int):
    m = month + delta
    y = year + (m - 1) // 12
    m = ((m - 1) % 12) + 1
    return y, m


async def open_calendar(message: types.Message):
    today = date.today()
    marked = get_marked_days_for_month(today.year, today.month)
    kb = get_calendar_keyboard(today.year, today.month, marked)
    await message.answer(f"Календарь: {months_ru[today.month - 1]} {today.year}", reply_markup=kb)


async def calendar_nav(callback_query: types.CallbackQuery):
    try:
        data = callback_query.data  # cal_prev_YYYY_MM or cal_next_YYYY_MM or cal_today_Y_M
        if data.startswith("cal_today_"):
            parts = data.split("_")
            year = int(parts[2])
            month = int(parts[3])
        else:
            _, kind, y, m = data.split("_")
            year = int(y)
            month = int(m)
            delta = -1 if kind == "prev" else 1
            year, month = _month_shift(year, month, delta)

        marked = get_marked_days_for_month(year, month)
        kb = get_calendar_keyboard(year, month, marked)
        await callback_query.message.edit_text(f"Календарь: {months_ru[month - 1]} {year}")
        await callback_query.message.edit_reply_markup(reply_markup=kb)
        await callback_query.answer()
    except Exception as e:
        await callback_query.answer("Ошибка обновления календаря")


async def calendar_day(callback_query: types.CallbackQuery):
    try:
        # cal_day_YYYY-MM-DD
        _, _, ymd = callback_query.data.split("_", 2)
        clients = get_clients_by_day(ymd)
        if not clients:
            await callback_query.message.answer(f"Записей на {datetime.strptime(ymd, '%Y-%m-%d').strftime('%d.%m.%Y')} нет.")
            await callback_query.answer()
            return
        # Sort by time as already ordered; format
        lines = [f"Записи на {datetime.strptime(ymd, '%Y-%m-%d').strftime('%d.%m.%Y')}:" ]
        for c in clients:
            # id, name, link, time, day_rec, prepayment
            name = c[1] or ""
            link = c[2] or ""
            tm = c[3] or ""
            prepay = c[5] if len(c) > 5 and c[5] is not None else 0
            prepay_str = f"{prepay:.2f}".rstrip('0').rstrip('.')
            if link:
                lines.append(f"{tm} — {name} ({link}), предоплата: {prepay_str}")
            else:
                lines.append(f"{tm} — {name}, предоплата: {prepay_str}")
        await callback_query.message.answer("\n".join(lines))
        await callback_query.answer()
    except Exception:
        await callback_query.answer("Ошибка загрузки записей за день")


def register_calendar(dp: Dispatcher):
    dp.register_message_handler(open_calendar, text='Календарь')
    dp.register_callback_query_handler(calendar_nav, text_startswith='cal_prev_')
    dp.register_callback_query_handler(calendar_nav, text_startswith='cal_next_')
    dp.register_callback_query_handler(calendar_nav, text_startswith='cal_today_')
    dp.register_callback_query_handler(calendar_day, text_startswith='cal_day_')


