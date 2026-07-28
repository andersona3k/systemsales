from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.usuario import Usuario
from ..schemas.auth import LoginRequest, Token
from ..services.auth_service import create_access_token, verificar_senha

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])


@router.post("/login", response_model=Token)
def login(dados: LoginRequest, db: Session = Depends(get_db)):
    u = db.query(Usuario).filter(Usuario.username == dados.username, Usuario.ativo == True).first()
    if not u or not verificar_senha(dados.password, u.senha_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário ou senha incorretos")
    token = create_access_token({"sub": u.username, "uid": str(u.id), "role": u.role})
    return Token(access_token=token)
