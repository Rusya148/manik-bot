from aiogram import types
from aiogram.dispatcher import Dispatcher

from app.db.session import get_async_session
from app.repositories.access import AccessRepository
from app.repositories.users import UserRepository
from app.services.access import AccessService
from app.services.admin import AdminService


ADMIN_HELP = (
    "Админ-панель:\n"
    "/admin list [page] — список пользователей\n"
    "/admin status <tg_id> — статус доступа\n"
    "/admin grant <tg_id> — выдать доступ\n"
    "/admin revoke <tg_id> — отозвать доступ\n"
    "/admin promote <tg_id> — назначить админа\n"
    "/admin demote <tg_id> — снять админа\n"
)


async def _require_admin(message: types.Message) -> tuple[types.Message, int]:
    session = get_async_session()
    service = AccessService(session)
    try:
        user = await service.ensure_user(
            message.from_user.id,
            message.from_user.username,
            message.from_user.first_name,
            message.from_user.last_name,
        )
        if not await service.is_admin(user.id):
            await message.answer("Доступ запрещён")
            raise PermissionError()
        await session.commit()
        return message, user.id
    finally:
        await session.close()


async def admin_command(message: types.Message):
    try:
        _, admin_id = await _require_admin(message)
    except PermissionError:
        return

    args = message.get_args().split()
    if not args:
        await message.answer(ADMIN_HELP)
        return

    action = args[0].lower()
    param = args[1] if len(args) > 1 else None

    session = get_async_session()
    try:
        access_service = AccessService(session)
        admin_service = AdminService(session)
        users_repo = UserRepository(session)
        access_repo = AccessRepository(session)

        if action == "list":
            page = int(param) if param and param.isdigit() else 1
            page = max(1, page)
            limit = 20
            offset = (page - 1) * limit
            users = await users_repo.list_users(offset, limit)
            lines = [f"Пользователи (страница {page}):"]
            for user in users:
                access = await access_repo.get_active_access(user.id)
                is_admin = await admin_service.is_admin(user.id)
                status = "доступ" if access or is_admin else "нет доступа"
                role = "админ" if is_admin else "пользователь"
                lines.append(f"{user.tg_id} @{user.username or '-'} — {status}, {role}")
            await message.answer("\n".join(lines))
        elif action in {"grant", "revoke", "status", "promote", "demote"}:
            if not param:
                await message.answer("Укажи tg_id или @username.")
                return
            if param.startswith("@"):
                user = await users_repo.get_by_username(param)
                if not user:
                    await message.answer("Пользователь с таким @ не найден. Сначала пусть напишет /start.")
                    return
            elif param.isdigit():
                user = await users_repo.create_or_update(int(param), None, None, None)
            else:
                await message.answer("Укажи tg_id числом или @username.")
                return
            if action == "grant":
                await access_service.grant_access(user, admin_id)
                await message.answer(f"Доступ выдан {user.tg_id}.")
            elif action == "revoke":
                revoked = await access_service.revoke_access(user.id)
                await message.answer(
                    f"Доступ отозван {user.tg_id}." if revoked else "Доступ не был выдан."
                )
            elif action == "status":
                access = await access_repo.get_active_access(user.id)
                is_admin = await admin_service.is_admin(user.id)
                status = "доступ" if access or is_admin else "нет доступа"
                await message.answer(f"{user.tg_id}: {status}.")
            elif action == "promote":
                await admin_service.promote(user.id, admin_id)
                await message.answer(f"Админ назначен для {user.tg_id}.")
            elif action == "demote":
                demoted = await admin_service.demote(user.id)
                await message.answer(
                    f"Админ снят для {user.tg_id}." if demoted else "Пользователь не админ."
                )
        else:
            await message.answer(ADMIN_HELP)

        await session.commit()
    finally:
        await session.close()


def register_admin_handlers(dp: Dispatcher):
    dp.register_message_handler(admin_command, commands="admin")
