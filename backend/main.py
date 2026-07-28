import os
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from .database import engine, Base
from .models import *  # noqa
from .routers import auth, empresas, contatos, categorias, campos_customizados, configuracoes, dashboard, ocr, perfis_exportacao, usuarios, publicacoes, resumo, cervejas, links, galerias, cofre, redes, financeiro, operacoes, prospeccao
from .config import get_settings

settings = get_settings()

Base.metadata.create_all(bind=engine)

# Seed super admin inicial
from .models.usuario import Usuario as _Usuario
from .services.auth_service import hash_senha as _hash
from .database import SessionLocal as _SL
_db = _SL()
try:
    if _db.query(_Usuario).count() == 0:
        _db.add(_Usuario(nome="Anderson", username=settings.admin_username, role="super_admin", senha_hash=_hash(settings.admin_password), permissoes={}, ativo=True))
        _db.commit()
finally:
    _db.close()

os.makedirs(settings.upload_dir, exist_ok=True)

app = FastAPI(title="CardBase API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(empresas.router)
app.include_router(contatos.router)
app.include_router(categorias.router)
app.include_router(campos_customizados.router)
app.include_router(configuracoes.router)
app.include_router(ocr.router)
app.include_router(perfis_exportacao.router)
app.include_router(usuarios.router)
app.include_router(publicacoes.router)
app.include_router(resumo.router)
app.include_router(cervejas.router)
app.include_router(links.router)
app.include_router(galerias.router)
app.include_router(cofre.router)
app.include_router(redes.router)
app.include_router(financeiro.router)
app.include_router(operacoes.router)
app.include_router(prospeccao.router)

app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")

if os.path.exists(frontend_dir):
    app.mount("/css", StaticFiles(directory=os.path.join(frontend_dir, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(frontend_dir, "js")), name="js")

    class SPAMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            response = await call_next(request)
            if response.status_code == 404 and not request.url.path.startswith(("/api/", "/css/", "/js/", "/uploads/")):
                return FileResponse(os.path.join(frontend_dir, "index.html"))
            return response

    app.add_middleware(SPAMiddleware)

    @app.get("/", include_in_schema=False)
    def serve_index():
        return FileResponse(os.path.join(frontend_dir, "index.html"))
