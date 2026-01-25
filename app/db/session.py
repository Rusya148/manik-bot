from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings


engine = create_async_engine(settings.database_url, pool_pre_ping=True)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


def get_async_session() -> AsyncSession:
    return async_session_factory()


def get_tenant_session(schema_name: str) -> AsyncSession:
    bind = engine.execution_options(schema_translate_map={"tenant": schema_name})
    return AsyncSession(bind=bind, expire_on_commit=False)
