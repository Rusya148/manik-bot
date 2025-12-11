from aiogram.types import KeyboardButton, ReplyKeyboardMarkup, InlineKeyboardButton, InlineKeyboardMarkup
import calendar
from datetime import date

kb_start = ReplyKeyboardMarkup(
    [
        [KeyboardButton(text='Записать клиента'),
         KeyboardButton(text='Удалить клиента'),
         KeyboardButton(text='Клиенты')],
        [KeyboardButton(text='Зарплата'),
         KeyboardButton(text='Траты')],
        [KeyboardButton(text='Календарь')]
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

months_ru = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
]

def get_calendar_keyboard(year: int, month: int, marked_days=None) -> InlineKeyboardMarkup:
    if marked_days is None:
        marked_days = set()
    cal = InlineKeyboardMarkup(row_width=7)

    # Header with month and navigation
    month_name = months_ru[month - 1]
    header = InlineKeyboardButton(text=f"{month_name} {year}", callback_data="cal_nop")
    prev_cb = InlineKeyboardButton(text="‹", callback_data=f"cal_prev_{year}_{month}")
    next_cb = InlineKeyboardButton(text="›", callback_data=f"cal_next_{year}_{month}")
    # Place header across three buttons: prev | title | next
    cal.row(prev_cb, header, next_cb)

    # Weekdays row (Mon..Sun)
    for wd in ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]:
        cal.insert(InlineKeyboardButton(text=wd, callback_data="cal_nop"))

    # Month days
    month_calendar = calendar.Calendar(firstweekday=0).monthdayscalendar(year, month)
    for week in month_calendar:
        buttons = []
        for day_num in week:
            if day_num == 0:
                buttons.append(InlineKeyboardButton(text=" ", callback_data="cal_nop"))
            else:
                day_str = f"{day_num:02d}"
                ymd = f"{year}-{month:02d}-{day_str}"
                marker = "•" if day_num in marked_days else ""
                buttons.append(InlineKeyboardButton(text=f"{day_num}{marker}", callback_data=f"cal_day_{ymd}"))
        cal.row(*buttons)

    # Today shortcut
    today = date.today()
    cal.row(InlineKeyboardButton(text="Сегодня", callback_data=f"cal_today_{today.year}_{today.month}"))
    return cal

