from app.config import settings
from app.repositories.admins import AdminRepository
from app.repositories.users import UserRepository


async def ensure_admins(session) -> None:
    repo_users = UserRepository(session)
    repo_admins = AdminRepository(session)
    for tg_id in settings.admin_ids:
        user = await repo_users.create_or_update(tg_id, None, None, None)
        await repo_admins.promote(user.id, None)
