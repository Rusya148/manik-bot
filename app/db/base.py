from sqlalchemy.orm import DeclarativeBase


class BasePublic(DeclarativeBase):
    pass


class BaseTenant(DeclarativeBase):
    pass
