from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from uuid import UUID
from ..database import get_db
from ..models.link import Link
from ..schemas.link import LinkCreate, LinkOut
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/links", tags=["Links"])


@router.get("", response_model=list[LinkOut])
def listar(categoria: str | None = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.query(Link)
    if categoria:
        q = q.filter(Link.categoria == categoria)
    return q.order_by(Link.categoria, Link.grupo, Link.nome).all()


@router.post("", response_model=LinkOut, status_code=201)
def criar(dados: LinkCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    l = Link(**dados.model_dump())
    db.add(l); db.commit(); db.refresh(l)
    return l


@router.patch("/{lid}", response_model=LinkOut)
def atualizar(lid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    l = db.query(Link).filter(Link.id == lid).first()
    if not l:
        raise HTTPException(status_code=404, detail="Não encontrado")
    for k in ("categoria", "grupo", "nome", "website"):
        if k in dados:
            setattr(l, k, dados[k])
    db.commit(); db.refresh(l)
    return l


@router.delete("/{lid}", status_code=204)
def deletar(lid: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    l = db.query(Link).filter(Link.id == lid).first()
    if not l:
        raise HTTPException(status_code=404, detail="Não encontrado")
    db.delete(l); db.commit()
