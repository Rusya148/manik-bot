from sqlalchemy import text

from app.db import models_tenant  # noqa: F401

from app.db.base import BaseTenant
from app.db.session import engine


async def create_tenant_schema(schema_name: str) -> None:
    async with engine.begin() as conn:
        await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
        await conn.run_sync(
            BaseTenant.metadata.create_all,
            schema_translate_map={"tenant": schema_name},
        )


def schema_for_user(tg_id: int) -> str:
    safe_id = abs(int(tg_id))
    return f"user_{safe_id}"
