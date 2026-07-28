from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models.contato import Contato
from ..models.empresa import Empresa
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("")
def obter_dashboard(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    total_contatos = db.query(Contato).count()
    total_empresas = db.query(Empresa).count()

    ultimos_contatos = (
        db.query(Contato)
        .options(joinedload(Contato.empresa))
        .order_by(Contato.criado_em.desc())
        .limit(5)
        .all()
    )

    return {
        "total_contatos": total_contatos,
        "total_empresas": total_empresas,
        "ultimos_contatos": [
            {
                "id": str(c.id),
                "nome": c.nome,
                "cargo": c.cargo,
                "empresa_nome": c.empresa.nome if c.empresa else None,
                "telefone1": c.telefone1,
                "email": c.email,
                "foto_frente": c.foto_frente,
                "criado_em": c.criado_em.isoformat(),
            }
            for c in ultimos_contatos
        ],
    }
