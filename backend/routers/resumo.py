from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime, timedelta
from ..database import get_db
from ..models.contato import Contato
from ..models.empresa import Empresa
from ..models.publicacao import Publicacao
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/resumo", tags=["Resumo"])


@router.get("")
def resumo(db: Session = Depends(get_db), _=Depends(get_current_user)):
    cinco = datetime.utcnow() - timedelta(days=5)
    contatos_total = db.query(Contato).count()
    empresas_total = db.query(Empresa).count()
    novos_contatos = db.query(Contato).options(joinedload(Contato.empresa)).filter(Contato.criado_em >= cinco).order_by(Contato.criado_em.desc()).all()
    novas_empresas = db.query(Empresa).filter(Empresa.criado_em >= cinco).order_by(Empresa.criado_em.desc()).all()
    rows = db.query(Publicacao.canal, Publicacao.planejador, func.count()).filter(Publicacao.arquivado == False).group_by(Publicacao.canal, Publicacao.planejador).all()
    pub = {"linkedin": {}, "instagram": {}}
    for canal, plan, n in rows:
        c = canal or "linkedin"
        pub.setdefault(c, {})
        pub[c][plan or "—"] = n
    return {
        "contatos_total": contatos_total,
        "empresas_total": empresas_total,
        "contatos_5d": len(novos_contatos),
        "empresas_5d": len(novas_empresas),
        "novos_contatos": [{"id": str(c.id), "nome": c.nome, "empresa": c.empresa.nome if c.empresa else None} for c in novos_contatos[:20]],
        "novas_empresas": [{"id": str(e.id), "nome": e.nome} for e in novas_empresas[:20]],
        "publicacoes": pub,
    }
