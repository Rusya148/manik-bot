import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.services.bootstrap import ensure_admins
from app.web.routers import access as access_router
from app.web.routers import clients as clients_router
from app.web.routers import schedule as schedule_router
from app.db.session import get_async_session


app = FastAPI(title="Manik Bot Web API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.webapp_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _resolve_web_root() -> str:
    candidates = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(BASE_DIR))), "web"),
        os.path.join(os.path.dirname(os.path.dirname(BASE_DIR)), "web"),
        os.path.join(os.path.dirname(BASE_DIR), "web"),
        "/app/web",
        "/web",
    ]
    for path in candidates:
        if os.path.exists(os.path.join(path, "dist", "index.html")):
            return path
        if os.path.exists(os.path.join(path, "index.html")):
            return path
    return os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(BASE_DIR))), "web")


WEB_ROOT = _resolve_web_root()
DIST_DIR = os.path.join(WEB_ROOT, "dist")
ASSETS_DIR = os.path.join(DIST_DIR, "assets")
INDEX_PATH = os.path.join(DIST_DIR, "index.html")

app.mount("/assets", StaticFiles(directory=ASSETS_DIR, check_dir=False), name="assets")


@app.on_event("startup")
async def startup_event():
    session = get_async_session()
    try:
        await ensure_admins(session)
        await session.commit()
    finally:
        await session.close()


@app.get("/")
def root():
    if os.path.exists(INDEX_PATH):
        return FileResponse(INDEX_PATH)
    fallback = os.path.join(WEB_ROOT, "index.html")
    if os.path.exists(fallback):
        return FileResponse(fallback)
    return {"status": "webapp_not_built"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


app.include_router(access_router.router, prefix="/api")
app.include_router(clients_router.router, prefix="/api")
app.include_router(schedule_router.router, prefix="/api")
