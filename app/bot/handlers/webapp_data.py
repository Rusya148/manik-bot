import json

from aiogram import types
from aiogram.dispatcher import Dispatcher


async def handle_webapp_data(message: types.Message):
    if not message.web_app_data:
        return
    try:
        payload = json.loads(message.web_app_data.data)
    except Exception:
        return
    if payload.get("type") != "schedule":
        return
    html = payload.get("html") or ""
    text = payload.get("text") or ""
    if html:
        await message.answer(html, parse_mode="HTML")
    elif text:
        await message.answer(text)


def register_webapp_handlers(dp: Dispatcher):
    dp.register_message_handler(handle_webapp_data, content_types=types.ContentType.WEB_APP_DATA)
