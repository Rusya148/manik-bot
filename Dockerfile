FROM node:20-alpine AS web-build

WORKDIR /web
COPY web/package.json web/package-lock.json* web/pnpm-lock.yaml* web/yarn.lock* /web/
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY web /web
RUN npm run build


FROM python:3.11-slim AS python-build

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements /app/requirements
RUN pip install --no-cache-dir --prefix=/install -r requirements


FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=python-build /install /usr/local
COPY . /app
COPY --from=web-build /web/dist /app/web/dist

RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app
USER appuser
