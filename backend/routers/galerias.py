import os, uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from sqlalchemy.orm import Session
from uuid import UUID
from ..database import get_db
from ..models.galeria import Galeria
from ..schemas.galeria import GaleriaCreate, GaleriaOut
from ..services.auth_service import get_current_user
from ..config import get_settings
from ..services.img_service import salvar_imagem

router = APIRouter(prefix="/api/galerias", tags=["Galerias"])
settings = get_settings()


def _salvar_img(arquivo, prefixo="galeria"):
    return salvar_imagem(arquivo, settings.upload_dir, prefixo)


@router.get("", response_model=list[GaleriaOut])
def listar(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Galeria).order_by(Galeria.criado_em.asc()).all()


@router.post("", response_model=GaleriaOut, status_code=201)
def criar(dados: GaleriaCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    g = Galeria(**dados.model_dump())
    db.add(g); db.commit(); db.refresh(g)
    return g


@router.patch("/{gid}", response_model=GaleriaOut)
def atualizar(gid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    g = db.query(Galeria).filter(Galeria.id == gid).first()
    if not g:
        raise HTTPException(status_code=404, detail="Não encontrada")
    if "titulo" in dados:
        g.titulo = dados["titulo"]
    db.commit(); db.refresh(g)
    return g


@router.post("/{gid}/imagem", response_model=GaleriaOut)
def upload_imagem(gid: UUID, foto: UploadFile = File(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    g = db.query(Galeria).filter(Galeria.id == gid).first()
    if not g:
        raise HTTPException(status_code=404, detail="Não encontrada")
    g.imagens = list(g.imagens or []) + [_salvar_img(foto)]
    db.commit(); db.refresh(g)
    return g


@router.delete("/{gid}/imagem", response_model=GaleriaOut)
def del_imagem(gid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    g = db.query(Galeria).filter(Galeria.id == gid).first()
    if not g:
        raise HTTPException(status_code=404, detail="Não encontrada")
    g.imagens = [u for u in (g.imagens or []) if u != dados.get("url")]
    db.commit(); db.refresh(g)
    return g


@router.delete("/{gid}", status_code=204)
def deletar(gid: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    g = db.query(Galeria).filter(Galeria.id == gid).first()
    if not g:
        raise HTTPException(status_code=404, detail="Não encontrada")
    db.delete(g); db.commit()
