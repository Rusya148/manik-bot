from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    WebAppInfo,
)

from app.config import settings
import calendar
from datetime import date


_kb_start_rows = [
    [KeyboardButton(text="Записать клиента"), KeyboardButton(text="Удалить клиента"), KeyboardButton(text="Клиенты")],
    [KeyboardButton(text="Календарь"), KeyboardButton(text="Расписание")],
]
if settings.webapp_url:
    _kb_start_rows.append([KeyboardButton(text="Веб-версия", web_app=WebAppInfo(url=settings.webapp_url))])

kb_start = ReplyKeyboardMarkup(_kb_start_rows, resize_keyboard=True)

kb_back_inline = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="Назад", callback_data="back")]])

kb_exit_delete = InlineKeyboardMarkup(
    inline_keyboard=[[InlineKeyboardButton(text="Закрыть", callback_data="exit_delete")]]
)

kb_registered_client = InlineKeyboardMarkup(
    inline_keyboard=[
        [
            InlineKeyboardButton(text="Сегодня", callback_data="clients_today"),
            InlineKeyboardButton(text="Неделя", callback_data="clients_week"),
            InlineKeyboardButton(text="Все записи", callback_data="clients_month"),
        ]
    ]
)

months_ru = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
]


def get_prepayment_keyboard():
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="✓", callback_data="prepay_yes"),
                InlineKeyboardButton(text="✗", callback_data="prepay_no"),
            ],
            [InlineKeyboardButton(text="Назад", callback_data="back")],
        ]
    )


def get_calendar_keyboard(year: int, month: int, marked_days=None) -> InlineKeyboardMarkup:
    if marked_days is None:
        marked_days = set()
    cal = InlineKeyboardMarkup(row_width=7)

    month_name = months_ru[month - 1]
    header = InlineKeyboardButton(text=f"{month_name} {year}", callback_data="cal_nop")
    prev_cb = InlineKeyboardButton(text="‹", callback_data=f"cal_prev_{year}_{month}")
    next_cb = InlineKeyboardButton(text="›", callback_data=f"cal_next_{year}_{month}")
    cal.row(prev_cb, header, next_cb)

    wd_buttons = [InlineKeyboardButton(text=wd, callback_data="cal_nop") for wd in ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]]
    cal.row(*wd_buttons)

    month_calendar = calendar.Calendar(firstweekday=0).monthdayscalendar(year, month)
    for week in month_calendar:
        buttons = []
        for day_num in week:
            if day_num == 0:
                buttons.append(InlineKeyboardButton(text=" ", callback_data="cal_nop"))
            else:
                marker = "•" if day_num in marked_days else ""
                buttons.append(InlineKeyboardButton(text=f"{day_num}{marker}", callback_data=f"cal_day_{year}-{month:02d}-{day_num:02d}"))
        cal.row(*buttons)

    today = date.today()
    cal.row(InlineKeyboardButton(text="Сегодня", callback_data=f"cal_today_{today.year}_{today.month}"))
    return cal


def get_schedule_calendar_keyboard(
    year: int,
    month: int,
    marked_days=None,
    selected_days=None,
) -> InlineKeyboardMarkup:
    if marked_days is None:
        marked_days = set()
    if selected_days is None:
        selected_days = set()
    cal = InlineKeyboardMarkup(row_width=7)

    month_name = months_ru[month - 1]
    header = InlineKeyboardButton(text=f"{month_name} {year}", callback_data="sch_nop")
    prev_cb = InlineKeyboardButton(text="‹", callback_data=f"sch_prev_{year}_{month}")
    next_cb = InlineKeyboardButton(text="›", callback_data=f"sch_next_{year}_{month}")
    cal.row(prev_cb, header, next_cb)

    wd_buttons = [InlineKeyboardButton(text=wd, callback_data="sch_nop") for wd in ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]]
    cal.row(*wd_buttons)

    month_calendar = calendar.Calendar(firstweekday=0).monthdayscalendar(year, month)
    for week in month_calendar:
        buttons = []
        for day_num in week:
            if day_num == 0:
                buttons.append(InlineKeyboardButton(text=" ", callback_data="sch_nop"))
            else:
                marker = "•" if day_num in marked_days else ""
                checked = "✓" if day_num in selected_days else ""
                label = f"{day_num}{marker}{checked}"
                buttons.append(
                    InlineKeyboardButton(
                        text=label, callback_data=f"sch_day_{year}-{month:02d}-{day_num:02d}"
                    )
                )
        cal.row(*buttons)

    cal.row(InlineKeyboardButton(text="Сгенерировать расписание", callback_data=f"sch_generate_{year}_{month}"))
    cal.row(InlineKeyboardButton(text="Выйти", callback_data="sch_exit"))
    return cal
