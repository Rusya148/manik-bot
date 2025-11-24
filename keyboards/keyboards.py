from aiogram.types import KeyboardButton, ReplyKeyboardMarkup, InlineKeyboardButton, InlineKeyboardMarkup

kb_start = ReplyKeyboardMarkup(
    [
        [KeyboardButton(text='Записать клиента'),
         KeyboardButton(text='Удалить клиента'),
         KeyboardButton(text='Клиенты')],
        [KeyboardButton(text='Зарплата'),
         KeyboardButton(text='Траты')]
    ], resize_keyboard=True
)

kb_salary = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text='Добавить', callback_data='add'),
     InlineKeyboardButton(text='Зарплата', callback_data='salary')]
])

kb_expenses = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text='Добавить', callback_data='add_expenses'),
     InlineKeyboardButton(text='Траты', callback_data='expenses')]
])

def get_continue_keyboard1():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Продолжить", callback_data="continue_add_expenses"),
         InlineKeyboardButton(text="Удалить последнюю сумму", callback_data="remove_last_expenses"),
        InlineKeyboardButton(text="Отменить", callback_data="cancel_add_expenses")]
    ])

def get_months_keyboard():
    months = [
        "январь", "февраль", "март", "апрель", "май", "июнь",
        "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"
    ]
    keyboard = InlineKeyboardMarkup(row_width=3)
    buttons = [InlineKeyboardButton(text=month.capitalize(), callback_data=f"month_{i + 1}") for i, month in enumerate(months)]
    keyboard.add(*buttons)
    return keyboard

def get_months_keyboard1():
    months = [
        "январь", "февраль", "март", "апрель", "май", "июнь",
        "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"
    ]
    keyboard = InlineKeyboardMarkup(row_width=3)
    buttons = [InlineKeyboardButton(text=month.capitalize(), callback_data=f"month-{i + 1}") for i, month in enumerate(months)]
    keyboard.add(*buttons)
    return keyboard

def get_continue_keyboard():
    return InlineKeyboardMarkup().add(
        InlineKeyboardButton("Продолжить", callback_data="continue_add"),
        InlineKeyboardButton("Удалить последнее", callback_data="remove_last_add"),
        InlineKeyboardButton("Отменить", callback_data="cancel_add")
    )

kb_back_inline = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="Назад", callback_data="back")]
])

kb_registered_client = InlineKeyboardMarkup(inline_keyboard=[
    [
        InlineKeyboardButton(text='Сегодня', callback_data='clients_today'),
        InlineKeyboardButton(text='Неделя', callback_data='clients_week'),
        InlineKeyboardButton(text='Все записи', callback_data='clients_month')
    ]
])

kb_exit_delete = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text='Закрыть', callback_data='exit_delete')]
])

