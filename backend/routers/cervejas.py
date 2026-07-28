import os, uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from uuid import UUID
from ..database import get_db
from ..models.cerveja import Cerveja
from ..schemas.cerveja import CervejaCreate, CervejaOut
from ..services.auth_service import get_current_user
from ..config import get_settings
from ..services.img_service import salvar_imagem

router = APIRouter(prefix="/api/cervejas", tags=["Cervejas"])
settings = get_settings()
CAMPOS = ("cerveja","classe","estilo","embalagem","fabricacao","fabricante","cidade","estado","pais","onde_bebi","nota","comentario_interno","legenda","status","observacao","story","whatsapp","arquivado")


def _salvar_img(arquivo, prefixo="cerveja"):
    return salvar_imagem(arquivo, settings.upload_dir, prefixo)


@router.get("", response_model=list[CervejaOut])
def listar(q: str | None = None, status: str | None = None, pais: str | None = None, arquivado: bool = False,
           db: Session = Depends(get_db), _=Depends(get_current_user)):
    query = db.query(Cerveja).filter(Cerveja.arquivado == arquivado)
    if q:
        query = query.filter(or_(func.lower(Cerveja.cerveja).contains(func.lower(q)), func.lower(Cerveja.fabricante).contains(func.lower(q)), func.lower(Cerveja.classe).contains(func.lower(q))))
    if status:
        query = query.filter(Cerveja.status == status)
    if pais:
        query = query.filter(Cerveja.pais == pais)
    return query.order_by(Cerveja.numero.asc()).all()


@router.post("", response_model=CervejaOut, status_code=201)
def criar(dados: CervejaCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    d = dados.model_dump()
    if d.get("numero") is None:
        d.pop("numero", None)
    c = Cerveja(**d)
    db.add(c); db.commit(); db.refresh(c)
    return c


@router.patch("/{cid}", response_model=CervejaOut)
def atualizar(cid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.query(Cerveja).filter(Cerveja.id == cid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Não encontrada")
    for k in CAMPOS:
        if k in dados:
            setattr(c, k, dados[k])
    db.commit(); db.refresh(c)
    return c


@router.post("/{cid}/imagem", response_model=CervejaOut)
def upload_imagem(cid: UUID, foto: UploadFile = File(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.query(Cerveja).filter(Cerveja.id == cid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Não encontrada")
    c.imagens = list(c.imagens or []) + [_salvar_img(foto)]
    db.commit(); db.refresh(c)
    return c


@router.delete("/{cid}/imagem", response_model=CervejaOut)
def del_imagem(cid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.query(Cerveja).filter(Cerveja.id == cid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Não encontrada")
    c.imagens = [u for u in (c.imagens or []) if u != dados.get("url")]
    db.commit(); db.refresh(c)
    return c


@router.delete("/{cid}", status_code=204)
def deletar(cid: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.query(Cerveja).filter(Cerveja.id == cid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Não encontrada")
    db.delete(c); db.commit()
