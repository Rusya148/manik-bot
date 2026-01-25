# Manik Bot

Асинхронный Telegram-бот и Mini App для записи клиентов, календаря и расписания.
Хранение данных — PostgreSQL, мульти-тенантность через отдельные схемы на пользователя.

## Возможности

- Запись клиента: имя, ссылка/id, время, дата, предоплата.
- Календарь записей с отметками занятых дней.
- Просмотр клиентов на сегодня / неделю / весь период.
- Удаление клиента по ссылке/id.
- Генерация расписания по выбранным дням с учетом уже записанных клиентов.
- Админка через Telegram-команды.
- Контроль доступа к боту и Mini App.

## Быстрый старт (docker-compose)

1) Создайте `.env` в корне проекта:

```
BOT_TOKEN=your_bot_token
WEBAPP_URL=https://your-domain
DATABASE_URL=postgresql+asyncpg://manik:manik@db:5432/manik
ADMIN_TELEGRAM_IDS=123456789
WEBAPP_ORIGIN=*
```

2) Запустите сервисы:

```
docker-compose up --build
```

## Доступ и админка

По умолчанию доступ запрещен. Админ выдаёт доступ через команды:

- `/admin list [page]` — список пользователей.
- `/admin status <tg_id>` — статус доступа.
- `/admin grant <tg_id>` — выдать доступ и создать схему пользователя.
- `/admin revoke <tg_id>` — отозвать доступ.
- `/admin promote <tg_id>` — назначить админа.
- `/admin demote <tg_id>` — снять админа.

## Архитектура

```
app/
  bot/           # aiogram бот, хендлеры, middleware
  db/            # модели и подключения
  repositories/  # слой доступа к данным
  services/      # бизнес-логика
  web/           # FastAPI API + раздача Mini App
alembic/         # миграции для public-схемы
web/             # фронтенд Mini App (Vite)
```

### Мульти-тенантность

- `public` схема: `users`, `user_access`, `admin_users`.
- Для каждого пользователя создаётся своя схема `user_<tg_id>`.
- В пользовательской схеме: `clients`, `schedule_days`, `schedule_slots`.

## Форматы ввода

- Дата: `DD.MM.YYYY` (например, `25.01.2026`).
- Время: допускаются варианты `11:00`, `11.00`, `11-00`, `11`.

## Разработка

- Python 3.11+ (рекомендуется).
- `aiogram==2.25.1`, `FastAPI`, `SQLAlchemy async`, `asyncpg`.

