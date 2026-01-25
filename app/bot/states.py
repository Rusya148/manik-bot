from aiogram.dispatcher.filters.state import State, StatesGroup


class Form(StatesGroup):
    waiting_for_name = State()
    waiting_for_link = State()
    waiting_for_time = State()
    waiting_for_date = State()
    waiting_for_prepayment = State()


class DeleteForm(StatesGroup):
    waiting_for_delete = State()


class ScheduleForm(StatesGroup):
    selecting_days = State()
