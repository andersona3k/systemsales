import os, uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
from ..database import get_db
from ..models.publicacao import Publicacao
from ..schemas.publicacao import PublicacaoCreate, PublicacaoOut
from ..services.auth_service import get_current_user
from ..config import get_settings
from ..services.img_service import salvar_imagem

router = APIRouter(prefix="/api/publicacoes", tags=["Publicações"])
settings = get_settings()


def _salvar_img(arquivo, prefixo="pub"):
    return salvar_imagem(arquivo, settings.upload_dir, prefixo)


@router.get("/calendario", response_model=list[PublicacaoOut])
def calendario(inicio: str, fim: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Publicacao).filter(
        Publicacao.excluido == False,
        Publicacao.arquivado == False,
        Publicacao.planejador.in_(['Agendado', 'Planejado', 'Publicado']),
        Publicacao.data.isnot(None),
        Publicacao.data != '',
        Publicacao.data >= inicio,
        Publicacao.data <= fim,
    ).all()


@router.get("", response_model=list[PublicacaoOut])
def listar(categoria: str | None = None, planejador: str | None = None, tema: str | None = None, data: str | None = None,
           arquivado: bool = False, excluido: bool = False, canal: str = 'linkedin', origem_cerveja: str | None = None,
           db: Session = Depends(get_db), _=Depends(get_current_user)):
    if origem_cerveja:
        return db.query(Publicacao).filter(Publicacao.origem_cerveja_id == origem_cerveja, Publicacao.excluido == False).order_by(Publicacao.numero.desc()).all()
    q = db.query(Publicacao).filter(Publicacao.canal == canal, Publicacao.excluido == excluido)
    if not excluido:
        q = q.filter(Publicacao.arquivado == arquivado)
    if categoria:
        q = q.filter(Publicacao.categoria == categoria)
    if planejador:
        q = q.filter(Publicacao.planejador == planejador)
    if tema:
        q = q.filter(func.lower(Publicacao.tema).contains(func.lower(tema)))
    if data:
        q = q.filter(Publicacao.data == data)
    return q.order_by(Publicacao.numero.desc()).all()


@router.post("", response_model=PublicacaoOut, status_code=201)
def criar(dados: PublicacaoCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    d = dados.model_dump()
    canal = d.get('canal') or 'linkedin'
    maxn = db.query(func.max(Publicacao.numero)).filter(Publicacao.canal == canal).scalar() or 0
    d['numero'] = maxn + 1
    p = Publicacao(**d)
    db.add(p); db.commit(); db.refresh(p)
    return p


@router.patch("/{pid}", response_model=PublicacaoOut)
def atualizar(pid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(Publicacao).filter(Publicacao.id == pid).first()
    if not p:
        raise HTTPException(status_code=404, detail="Não encontrada")
    for k in ("categoria", "tema", "post", "hashtags", "data", "planejador", "arquivado", "excluido"):
        if k in dados:
            setattr(p, k, dados[k])
    db.commit(); db.refresh(p)
    return p


@router.post("/{pid}/imagem", response_model=PublicacaoOut)
def upload_imagem(pid: UUID, foto: UploadFile = File(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(Publicacao).filter(Publicacao.id == pid).first()
    if not p:
        raise HTTPException(status_code=404, detail="Não encontrada")
    rel = _salvar_img(foto)
    p.imagens = list(p.imagens or []) + [rel]
    db.commit(); db.refresh(p)
    return p


@router.delete("/{pid}/imagem", response_model=PublicacaoOut)
def del_imagem(pid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(Publicacao).filter(Publicacao.id == pid).first()
    if not p:
        raise HTTPException(status_code=404, detail="Não encontrada")
    url = dados.get("url")
    p.imagens = [u for u in (p.imagens or []) if u != url]
    db.commit(); db.refresh(p)
    return p


@router.delete("/{pid}", status_code=204)
def deletar(pid: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(Publicacao).filter(Publicacao.id == pid).first()
    if not p:
        raise HTTPException(status_code=404, detail="Não encontrada")
    p.excluido = True
    db.commit()
