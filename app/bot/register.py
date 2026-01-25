from aiogram import Dispatcher

from app.bot.handlers.admin import register_admin_handlers
from app.bot.handlers.calendar import register_calendar
from app.bot.handlers.clients_request_date import register_handlers as register_request_date
from app.bot.handlers.delete_client import register_delete_client
from app.bot.handlers.handler_back_buttons import register_handlers as register_callback_handlers
from app.bot.handlers.rec_client import register_handlers as register_rec_client_handlers
from app.bot.handlers.schedule import register_schedule
from app.bot.handlers.start import register_handlers as register_start_handlers
from app.bot.handlers.webapp_data import register_webapp_handlers


def register(dp: Dispatcher):
    register_start_handlers(dp)
    register_rec_client_handlers(dp)
    register_callback_handlers(dp)
    register_request_date(dp)
    register_delete_client(dp)
    register_calendar(dp)
    register_schedule(dp)
    register_webapp_handlers(dp)
    register_admin_handlers(dp)
