from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from ..database import get_db
from ..models.categoria import Categoria
from ..schemas.categoria import CategoriaCreate, CategoriaUpdate, CategoriaOut
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/categorias", tags=["Categorias"])


@router.get("", response_model=list[CategoriaOut])
def listar_categorias(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    return db.query(Categoria).order_by(Categoria.nome).all()


@router.post("", response_model=CategoriaOut, status_code=201)
def criar_categoria(dados: CategoriaCreate, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    cat = Categoria(**dados.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.put("/{cat_id}", response_model=CategoriaOut)
def atualizar_categoria(
    cat_id: UUID,
    dados: CategoriaUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    cat = db.query(Categoria).filter(Categoria.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(cat, campo, valor)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{cat_id}", status_code=204)
def deletar_categoria(cat_id: UUID, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    cat = db.query(Categoria).filter(Categoria.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    db.delete(cat)
    db.commit()
