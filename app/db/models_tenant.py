from sqlalchemy import Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseTenant


class Client(BaseTenant):
    __tablename__ = "clients"
    __table_args__ = {"schema": "tenant"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    link: Mapped[str] = mapped_column(String(255))
    time: Mapped[str] = mapped_column(String(16))
    day_rec: Mapped[str] = mapped_column(String(16))
    prepayment: Mapped[float] = mapped_column(Numeric(10, 2), default=0)


class ScheduleDay(BaseTenant):
    __tablename__ = "schedule_days"
    __table_args__ = {"schema": "tenant"}

    year: Mapped[int] = mapped_column(Integer, primary_key=True)
    month: Mapped[int] = mapped_column(Integer, primary_key=True)
    day: Mapped[int] = mapped_column(Integer, primary_key=True)


class ScheduleSlot(BaseTenant):
    __tablename__ = "schedule_slots"
    __table_args__ = {"schema": "tenant"}

    weekday: Mapped[int] = mapped_column(Integer, primary_key=True)
    slots: Mapped[str] = mapped_column(String(255), default="")
