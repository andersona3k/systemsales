from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.operacoes import PrecificacaoEvento, PrecificacaoProduto
from ..schemas.operacoes import PrecificacaoEventoIn, PrecificacaoEventoOut, PrecificacaoProdutoOut
from ..services.auth_service import get_current_user
from ..config import get_settings
from ..services.img_service import salvar_imagem

router = APIRouter(prefix="/api/operacoes", tags=["Operacoes"])
settings = get_settings()


def _produto_out(p: PrecificacaoProduto, margem_padrao, ptax_valor, transformar_reais) -> dict:
    custo = p.custo or 0
    margem_efetiva = p.margem_pct if p.margem_pct is not None else (margem_padrao or 20)
    venda = custo * (1 + margem_efetiva / 100)
    custo_brl = venda_brl = None
    if transformar_reais and ptax_valor:
        custo_brl = custo * ptax_valor
        venda_brl = venda * ptax_valor
    return {
        "id": p.id, "pn": p.pn, "descricao": p.descricao,
        "custo": custo, "margem_pct": p.margem_pct, "margem_efetiva": margem_efetiva,
        "foto_url": p.foto_url, "venda": venda,
        "custo_brl": custo_brl, "venda_brl": venda_brl,
    }


def _evento_out(e: PrecificacaoEvento) -> dict:
    produtos = [_produto_out(p, e.margem_padrao, e.ptax_valor, e.transformar_reais) for p in e.produtos]
    return {
        "id": e.id, "data": e.data, "cliente": e.cliente, "oportunidade": e.oportunidade,
        "dr": e.dr, "pc": e.pc, "goevo": e.goevo, "descricao": e.descricao,
        "ptax_valor": e.ptax_valor, "ptax_data": e.ptax_data, "transformar_reais": e.transformar_reais,
        "margem_padrao": e.margem_padrao, "moeda": e.moeda,
        "criado_em": e.criado_em, "total_produtos": len(produtos), "produtos": produtos,
    }


@router.get("/precificacao", response_model=List[PrecificacaoEventoOut])
def listar_precificacao(db: Session = Depends(get_db), _=Depends(get_current_user)):
    eventos = db.query(PrecificacaoEvento).order_by(PrecificacaoEvento.criado_em.desc()).all()
    return [_evento_out(e) for e in eventos]


@router.post("/precificacao", response_model=PrecificacaoEventoOut, status_code=201)
def criar_precificacao(dados: PrecificacaoEventoIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    d = dados.model_dump()
    produtos = d.pop("produtos", [])
    e = PrecificacaoEvento(**d)
    db.add(e); db.flush()
    for it in produtos:
        db.add(PrecificacaoProduto(evento_id=e.id, pn=it.get("pn"), descricao=it.get("descricao"),
                                    custo=it.get("custo") or 0, margem_pct=it.get("margem_pct")))
    db.commit(); db.refresh(e)
    return _evento_out(e)


@router.get("/precificacao/{eid}", response_model=PrecificacaoEventoOut)
def obter_precificacao(eid: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    e = db.query(PrecificacaoEvento).filter(PrecificacaoEvento.id == eid).first()
    if not e: raise HTTPException(404, "Evento não encontrado")
    return _evento_out(e)


@router.patch("/precificacao/{eid}", response_model=PrecificacaoEventoOut)
def atualizar_precificacao(eid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    e = db.query(PrecificacaoEvento).filter(PrecificacaoEvento.id == eid).first()
    if not e: raise HTTPException(404, "Evento não encontrado")
    for k in ("data", "cliente", "oportunidade", "dr", "pc", "goevo", "descricao",
              "ptax_valor", "ptax_data", "transformar_reais", "margem_padrao", "moeda"):
        if k in dados: setattr(e, k, dados[k])
    if "produtos" in dados:
        incoming = dados["produtos"]
        existentes = {str(p.id): p for p in e.produtos}
        ids_recebidos = {str(it["id"]) for it in incoming if it.get("id")}
        for pid, p in list(existentes.items()):
            if pid not in ids_recebidos:
                db.delete(p)
        for it in incoming:
            pid = str(it["id"]) if it.get("id") else None
            if pid and pid in existentes:
                p = existentes[pid]
                p.pn = it.get("pn"); p.descricao = it.get("descricao")
                p.custo = it.get("custo") or 0
                p.margem_pct = it.get("margem_pct")
            else:
                db.add(PrecificacaoProduto(evento_id=eid, pn=it.get("pn"), descricao=it.get("descricao"),
                                            custo=it.get("custo") or 0, margem_pct=it.get("margem_pct")))
    db.commit(); db.refresh(e)
    return _evento_out(e)


@router.delete("/precificacao/{eid}", status_code=204)
def deletar_precificacao(eid: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    e = db.query(PrecificacaoEvento).filter(PrecificacaoEvento.id == eid).first()
    if not e: raise HTTPException(404, "Evento não encontrado")
    db.delete(e); db.commit()


@router.post("/precificacao/produtos/{pid}/foto", response_model=PrecificacaoProdutoOut)
def anexar_foto_produto(pid: UUID, arquivo: UploadFile = File(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(PrecificacaoProduto).filter(PrecificacaoProduto.id == pid).first()
    if not p: raise HTTPException(404, "Produto não encontrado")
    p.foto_url = salvar_imagem(arquivo, settings.upload_dir, "pf_produto")
    db.commit(); db.refresh(p)
    return _produto_out(p, p.evento.margem_padrao, p.evento.ptax_valor, p.evento.transformar_reais)


@router.delete("/precificacao/produtos/{pid}/foto", response_model=PrecificacaoProdutoOut)
def remover_foto_produto(pid: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(PrecificacaoProduto).filter(PrecificacaoProduto.id == pid).first()
    if not p: raise HTTPException(404, "Produto não encontrado")
    p.foto_url = None
    db.commit(); db.refresh(p)
    return _produto_out(p, p.evento.margem_padrao, p.evento.ptax_valor, p.evento.transformar_reais)
