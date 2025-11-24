from aiogram.types import Message, CallbackQuery
from aiogram import Dispatcher
from datetime import datetime

from keyboards.keyboards import kb_expenses, get_months_keyboard1, get_continue_keyboard1
from states.states import ExpensesForm
from database.database import add_expenses_to_db, get_total_expenses_for_month, remove_last_expenses_from_db

months = [
    "январь", "февраль", "март", "апрель", "май", "июнь",
    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"
]

# Обработчик для вывода меню Трат
async def expenses(message: Message):
    await message.answer('Выберите пункт меню: ', reply_markup=kb_expenses)

# Обработчик для выбора месяца
async def expenses_month_selection(callback_query: CallbackQuery):
    await callback_query.message.answer("За какой месяц?", reply_markup=get_months_keyboard1())
    await callback_query.answer()

# Обработчик для отображения трат за выбранный месяц
async def expenses_for_selected_month(callback_query: CallbackQuery):
    try:
        data = callback_query.data  # Например, "month_1"
        month_index = int(data.split("-")[1])  # Преобразуем в номер месяца

        today = datetime.today()
        year = today.year  # Используем текущий год

        # Формируем строку для поиска в базе
        month_year = f"{year}-{month_index:02d}"
        total_expenses = get_total_expenses_for_month(month_year)  # Получаем траты, а не зарплату

        month_name = months[month_index - 1]
        await callback_query.message.answer(
            f"Траты за {month_name}: {total_expenses} руб."
        )
        await callback_query.answer()
    except Exception as e:
        print(f"Ошибка при обработке выбора месяца: {e}")
        await callback_query.message.answer("Произошла ошибка при обработке месяца.")
        await callback_query.answer()


# Обработчик для добавления трат
async def add_expenses(callback_query: CallbackQuery):
    # Запрашиваем сумму для добавления трат
    await callback_query.message.answer("Сколько потратила?", reply_markup=None)
    await ExpensesForm.waiting_for_expenses.set()

# Обработчик для обработки суммы трат
async def process_expenses(message: Message, state):
    try:
        expenses_amount = int(message.text)
        if expenses_amount <= 0:
            await message.answer("введите положительное значение для трат.")
            return

        # Сохраняем сумму во временное состояние
        await state.update_data(expenses_amount=expenses_amount)

        # Отправляем клавиатуру с выбором месяца
        await message.answer("На какой месяц добавить?:", reply_markup=get_months_keyboard1())

        # Переходим к состоянию выбора месяца для трат
        await ExpensesForm.waiting_for_month.set()

    except ValueError:
        await message.answer("Пожалуйста, введите корректное число для трат.")
    except Exception as e:
        print(f"Ошибка при обработке трат: {e}")
        await message.answer("Произошла ошибка при добавлении трат.")

# Обработчик для обработки выбранного месяца и добавления трат
async def process_selected_month_for_add_expenses(callback_query: CallbackQuery, state):
    try:
        # Получаем данные из состояния (сумма трат)
        data = await state.get_data()
        expenses_amount = data.get("expenses_amount")
        if not expenses_amount:
            await callback_query.message.answer("Ошибка: не указана сумма.")
            return

        # Получаем номер месяца из callback_data
        month_index = int(callback_query.data.split("-")[1])  # Например, "month_1" -> 1

        today = datetime.today()
        year = today.year  # Используем текущий год
        month_year = f"{year}-{month_index:02d}"  # Формируем месяц и год, например, "2025-03"

        # Добавляем траты в БД
        add_expenses_to_db(expenses_amount, month_year)

        # Получаем текущую сумму трат за месяц
        total_expenses = get_total_expenses_for_month(month_year)
        month_name = months[month_index - 1]

        # Отправляем результат
        await callback_query.message.answer(f"Траты за {month_name}: {total_expenses} руб.", reply_markup=get_continue_keyboard1())


        # Завершаем состояние
        await state.finish()
        await callback_query.answer()

    except Exception as e:
        print(f"Ошибка при добавлении трат в выбранный месяц: {e}")
        await callback_query.message.answer("Произошла ошибка при добавлении трат.")
        await callback_query.answer()

# Обработчик для продолжения добавления трат
async def handle_continue_add_expenses(callback_query: CallbackQuery):
    await callback_query.message.answer("Введите следующую сумму для добавления трат или нажмите 'Отменить'.")
    await ExpensesForm.waiting_for_expenses.set()

# Обработчик для отмены добавления трат
async def handle_cancel_add_expenses(callback_query: CallbackQuery):
    await callback_query.message.answer("Добавление трат отменено.")
    await callback_query.answer()

# Обработчик для удаления последней траты
async def handle_remove_last_expenses(callback_query: CallbackQuery):
    today = datetime.today()
    month_year = today.strftime("%Y-%m")

    try:
        remove_last_expenses_from_db(month_year)
        total_expenses = get_total_expenses_for_month(month_year)
        month_name = months[today.month - 1]
        await callback_query.message.answer(
            f"Последняя трата удалена. Текущие траты за {month_name}: {total_expenses} руб.")
    except Exception as e:
        print(f"Ошибка при удалении последней траты: {e}")
        await callback_query.message.answer("Произошла ошибка при удалении последней траты.")

    await callback_query.answer()

# Регистрация обработчиков
def register_expenses(dp: Dispatcher):
    dp.register_message_handler(expenses, text='Траты')
    dp.register_callback_query_handler(expenses_month_selection, text="expenses")
    dp.register_callback_query_handler(expenses_for_selected_month, text_startswith="month-")
    dp.register_callback_query_handler(add_expenses, text="add_expenses")
    dp.register_message_handler(process_expenses, state=ExpensesForm.waiting_for_expenses)
    dp.register_callback_query_handler(process_selected_month_for_add_expenses, text_startswith="month-", state=ExpensesForm.waiting_for_month)
    dp.register_callback_query_handler(handle_continue_add_expenses, text="continue_add_expenses")
    dp.register_callback_query_handler(handle_cancel_add_expenses, text="cancel_add_expenses")
    dp.register_callback_query_handler(handle_remove_last_expenses, text="remove_last_expenses")
