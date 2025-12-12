import re
from aiogram import types
from aiogram.dispatcher import Dispatcher
from aiogram.dispatcher.filters import Text
from datetime import date
from states.states import Form
from keyboards.keyboards import kb_back_inline, get_calendar_keyboard, months_ru, get_prepayment_keyboard
from database.database import save_client
from database.request_for_date import get_marked_days_for_month

DATE_REGEX = r'^\d{2}\.\d{2}\.\d{4}$'

async def rec_client(message: types.Message):
    await message.answer('Введите имя клиента:', reply_markup=kb_back_inline)
    await Form.waiting_for_name.set()

async def process_name(message: types.Message, state):
    client_name = message.text.strip()
    await message.answer('Введите ссылку/id на клиента: ', reply_markup=kb_back_inline)
    await state.update_data(name=client_name)
    await Form.waiting_for_link.set()

async def process_link(message: types.Message, state):
    client_link = message.text.strip()
    await message.answer('Введите время, на которое записан клиент: ', reply_markup=kb_back_inline)
    await state.update_data(link=client_link)
    await Form.waiting_for_time.set()

async def process_time(message: types.Message, state):
    client_time = message.text.strip()
    await state.update_data(time=client_time)
    today = date.today()
    marked = get_marked_days_for_month(today.year, today.month)
    calendar_kb = get_calendar_keyboard(today.year, today.month, marked)
    await message.answer(f"Выберите дату: {months_ru[today.month - 1]} {today.year}", reply_markup=calendar_kb)
    await Form.waiting_for_date.set()

async def process_request_for_data(message: types.Message, state):
    client_date = message.text.strip()

    if not re.match(DATE_REGEX, client_date):
        await message.answer("Неверный формат даты. Пожалуйста, введите дату в формате DD.MM.YYYY.", reply_markup=kb_back_inline)
        return

    day, month, year = client_date.split('.')
    formatted_date = f"{year}-{month}-{day}"

    await state.update_data(day_rec=formatted_date)
    await message.answer('Введите предоплату: ', reply_markup=kb_back_inline)
    await Form.waiting_for_prepayment.set()

async def rec_calendar_nav(callback_query: types.CallbackQuery, state):
    try:
        data = callback_query.data
        if data.startswith("cal_today_"):
            ymd = date.today().isoformat()
            await state.update_data(day_rec=ymd)
            await callback_query.message.answer('Предоплата?', reply_markup=get_prepayment_keyboard())
            await Form.waiting_for_prepayment.set()
            await callback_query.answer()
            return
        else:
            _, kind, y, m = data.split("_")
            year = int(y)
            month = int(m)
            delta = -1 if kind == "prev" else 1
            m2 = month + delta
            year = year + (m2 - 1) // 12
            month = ((m2 - 1) % 12) + 1
        marked = get_marked_days_for_month(year, month)
        kb = get_calendar_keyboard(year, month, marked)
        await callback_query.message.edit_text(f"Выберите дату: {months_ru[month - 1]} {year}")
        await callback_query.message.edit_reply_markup(reply_markup=kb)
        await callback_query.answer()
    except Exception:
        await callback_query.answer("Не удалось обновить календарь")

async def rec_calendar_day(callback_query: types.CallbackQuery, state):
    try:
        _, _, ymd = callback_query.data.split("_", 2)
        await state.update_data(day_rec=ymd)
        await callback_query.message.answer('Предоплата?', reply_markup=get_prepayment_keyboard())
        await Form.waiting_for_prepayment.set()
        await callback_query.answer()
    except Exception:
        await callback_query.answer("Не удалось выбрать дату")

async def process_prepayment(message: types.Message, state):
    text = message.text.strip().replace(' ', '').replace(',', '.')
    try:
        prepayment = float(text)
        if prepayment < 0:
            raise ValueError("negative")
    except Exception:
        await message.answer("Выберите предоплату кнопками ниже.", reply_markup=get_prepayment_keyboard())
        return

    user_data = await state.get_data()
    client_name = user_data['name']
    client_link = user_data['link']
    client_time = user_data['time']
    client_date = user_data['day_rec']

    try:
        save_client(client_name, client_link, client_time, client_date, prepayment)
        await message.answer('Клиент успешно записан!')
    except Exception as e:
        await message.answer(f"Произошла ошибка при записи клиента: {e}")

    await state.finish()

async def _finalize_client(callback_query: types.CallbackQuery, state, prepayment_value: float):
    user_data = await state.get_data()
    client_name = user_data['name']
    client_link = user_data['link']
    client_time = user_data['time']
    client_date = user_data['day_rec']
    try:
        save_client(client_name, client_link, client_time, client_date, prepayment_value)
        await callback_query.message.answer('Клиент успешно записан!')
    except Exception as e:
        await callback_query.message.answer(f"Произошла ошибка при записи клиента: {e}")
    await state.finish()
    await callback_query.answer()

async def set_prepayment_yes(callback_query: types.CallbackQuery, state):
    await _finalize_client(callback_query, state, 1.0)

async def set_prepayment_no(callback_query: types.CallbackQuery, state):
    await _finalize_client(callback_query, state, 0.0)

def register_handlers(dp: Dispatcher):
    dp.register_message_handler(rec_client, Text(equals='Записать клиента'))
    dp.register_message_handler(process_name, state=Form.waiting_for_name)
    dp.register_message_handler(process_link, state=Form.waiting_for_link)
    dp.register_message_handler(process_time, state=Form.waiting_for_time)
    # Календарь выбора даты
    dp.register_callback_query_handler(rec_calendar_nav, state=Form.waiting_for_date, text_startswith='cal_prev_')
    dp.register_callback_query_handler(rec_calendar_nav, state=Form.waiting_for_date, text_startswith='cal_next_')
    dp.register_callback_query_handler(rec_calendar_nav, state=Form.waiting_for_date, text_startswith='cal_today_')
    dp.register_callback_query_handler(rec_calendar_day, state=Form.waiting_for_date, text_startswith='cal_day_')
    # Оставляем текстовый ввод даты как запасной вариант
    dp.register_message_handler(process_request_for_data, state=Form.waiting_for_date)
    dp.register_message_handler(process_prepayment, state=Form.waiting_for_prepayment)
    dp.register_callback_query_handler(set_prepayment_yes, state=Form.waiting_for_prepayment, text='prepay_yes')
    dp.register_callback_query_handler(set_prepayment_no, state=Form.waiting_for_prepayment, text='prepay_no')
