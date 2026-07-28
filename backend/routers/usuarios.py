from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
import secrets, string
from ..database import get_db
from ..models.usuario import Usuario
from ..schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioOut, TrocarSenha
from ..services.auth_service import get_current_user, hash_senha, verificar_senha

router = APIRouter(prefix="/api/usuarios", tags=["Usuários"])


def _exige_gestor(user):
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Sem permissão")


@router.get("/me", response_model=UsuarioOut)
def meu_usuario(db: Session = Depends(get_db), user=Depends(get_current_user)):
    u = db.query(Usuario).filter(Usuario.username == user.get("username")).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return u


@router.post("/me/senha")
def trocar_minha_senha(dados: TrocarSenha, db: Session = Depends(get_db), user=Depends(get_current_user)):
    u = db.query(Usuario).filter(Usuario.username == user.get("username")).first()
    if not u or not verificar_senha(dados.senha_atual, u.senha_hash):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    u.senha_hash = hash_senha(dados.senha_nova)
    u.must_change = False
    db.commit()
    return {"ok": True}


@router.get("", response_model=list[UsuarioOut])
def listar(db: Session = Depends(get_db), user=Depends(get_current_user)):
    _exige_gestor(user)
    return db.query(Usuario).order_by(Usuario.nome).all()


@router.post("", response_model=UsuarioOut, status_code=201)
def criar(dados: UsuarioCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _exige_gestor(user)
    if db.query(Usuario).filter(Usuario.username == dados.username).first():
        raise HTTPException(status_code=409, detail="Usuário já existe")
    u = Usuario(nome=dados.nome, username=dados.username, role=dados.role,
                permissoes=dados.permissoes, senha_hash=hash_senha(dados.senha))
    db.add(u); db.commit(); db.refresh(u)
    return u


@router.put("/{uid}", response_model=UsuarioOut)
def atualizar(uid: UUID, dados: UsuarioUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _exige_gestor(user)
    u = db.query(Usuario).filter(Usuario.id == uid).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    for k, v in dados.model_dump(exclude_unset=True).items():
        setattr(u, k, v)
    db.commit(); db.refresh(u)
    return u


@router.post("/{uid}/reset-senha")
def reset_senha(uid: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Apenas Super Admin pode resetar senha")
    u = db.query(Usuario).filter(Usuario.id == uid).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    nova = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(10))
    u.senha_hash = hash_senha(nova); u.must_change = True
    db.commit()
    return {"senha": nova, "username": u.username, "nome": u.nome}


@router.delete("/{uid}", status_code=204)
def deletar(uid: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _exige_gestor(user)
    u = db.query(Usuario).filter(Usuario.id == uid).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    db.delete(u); db.commit()
