from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.proposta import (
    PropTemplate, PropProduto, PropContentBlock, PropProposta, PropGrupo, PropItem, PropPerda,
)
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/proposta", tags=["Proposta"])


# ---------- serialização ----------
def _template_out(t):
    return {"id": str(t.id), "tipo": t.tipo, "nome": t.nome, "versao": t.versao,
            "ativo": t.ativo, "config": t.config or {},
            "atualizado_em": t.atualizado_em.isoformat() if t.atualizado_em else None}


def _produto_out(p):
    return {"id": str(p.id), "nome": p.nome, "codigo": p.codigo, "categoria": p.categoria,
            "moeda": p.moeda or "BRL", "valor_unitario": p.valor_unitario or 0,
            "info_padrao": p.info_padrao or "", "ativo": p.ativo}


def _bloco_out(b):
    return {"id": str(b.id), "chave": b.chave, "titulo": b.titulo, "aplica_se_a": b.aplica_se_a,
            "conteudo_padrao": b.conteudo_padrao or {}, "versao": b.versao}


def _item_out(it):
    return {"id": str(it.id), "produto_id": str(it.produto_id) if it.produto_id else None,
            "codigo_produto": it.codigo_produto, "info_adicional": it.info_adicional or "",
            "quantidade": it.quantidade or 0, "valor_unitario": it.valor_unitario or 0,
            "margem_percentual": it.margem_percentual or 0, "ordem": it.ordem or 0}


def _perda_out(pe):
    return {"id": str(pe.id), "descricao_item": pe.descricao_item, "valor_reposicao": pe.valor_reposicao or 0}


def _grupo_out(g):
    return {"id": str(g.id), "categoria": g.categoria, "moeda": g.moeda or "BRL",
            "descritivo_unidade": g.descritivo_unidade, "periodo_locacao_meses": g.periodo_locacao_meses,
            "ordem": g.ordem or 0, "itens": [_item_out(x) for x in g.itens],
            "perdas": [_perda_out(x) for x in g.perdas]}


def _proposta_out(p):
    return {"id": str(p.id), "tipo": p.tipo, "status": p.status,
            "template_id": str(p.template_id) if p.template_id else None,
            "empresa_id": str(p.empresa_id) if p.empresa_id else None,
            "pessoa_id": str(p.pessoa_id) if p.pessoa_id else None,
            "data": p.data, "validade_dias": p.validade_dias, "texto_comercial": p.texto_comercial or {},
            "moeda_padrao": p.moeda_padrao or "BRL", "blocos": p.blocos or {},
            "criado_em": p.criado_em.isoformat() if p.criado_em else None,
            "grupos": [_grupo_out(g) for g in p.grupos]}


# ---------- Templates (modelos) ----------
@router.get("/templates")
def listar_templates(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [_template_out(t) for t in db.query(PropTemplate).order_by(PropTemplate.tipo, PropTemplate.nome).all()]


@router.post("/templates", status_code=201)
def criar_template(dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    t = PropTemplate(tipo=dados.get("tipo") or "venda", nome=dados.get("nome") or "Novo modelo",
                     versao=int(dados.get("versao") or 1), ativo=dados.get("ativo", True),
                     config=dados.get("config") or {})
    db.add(t); db.commit(); db.refresh(t)
    return _template_out(t)


@router.patch("/templates/{tid}")
def atualizar_template(tid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    t = db.query(PropTemplate).filter(PropTemplate.id == tid).first()
    if not t: raise HTTPException(404, "Modelo nao encontrado")
    for k in ("tipo", "nome", "versao", "ativo", "config"):
        if k in dados: setattr(t, k, dados[k])
    db.commit(); db.refresh(t)
    return _template_out(t)


@router.delete("/templates/{tid}", status_code=204)
def deletar_template(tid: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    t = db.query(PropTemplate).filter(PropTemplate.id == tid).first()
    if t: db.delete(t); db.commit()


# ---------- Produtos (catálogo Proposta Comercial) ----------
@router.get("/produtos")
def listar_produtos(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [_produto_out(p) for p in db.query(PropProduto).filter(PropProduto.ativo == True).order_by(PropProduto.categoria, PropProduto.nome).all()]


@router.post("/produtos", status_code=201)
def criar_produto(dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    nome = (dados.get("nome") or "").strip()
    if not nome: raise HTTPException(400, "Nome obrigatorio")
    p = PropProduto(nome=nome, codigo=dados.get("codigo"), categoria=dados.get("categoria"),
                    moeda=dados.get("moeda") or "BRL", valor_unitario=float(dados.get("valor_unitario") or 0),
                    info_padrao=dados.get("info_padrao"))
    db.add(p); db.commit(); db.refresh(p)
    return _produto_out(p)


@router.patch("/produtos/{pid}")
def atualizar_produto(pid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(PropProduto).filter(PropProduto.id == pid).first()
    if not p: raise HTTPException(404, "Produto nao encontrado")
    for k in ("nome", "codigo", "categoria", "moeda", "valor_unitario", "info_padrao", "ativo"):
        if k in dados: setattr(p, k, dados[k])
    db.commit(); db.refresh(p)
    return _produto_out(p)


@router.delete("/produtos/{pid}", status_code=204)
def deletar_produto(pid: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(PropProduto).filter(PropProduto.id == pid).first()
    if p: p.ativo = False; db.commit()


# ---------- Content Blocks (biblioteca de cláusulas) ----------
@router.get("/blocos")
def listar_blocos(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [_bloco_out(b) for b in db.query(PropContentBlock).order_by(PropContentBlock.chave).all()]


@router.post("/blocos", status_code=201)
def criar_bloco(dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    b = PropContentBlock(chave=dados.get("chave"), titulo=dados.get("titulo"),
                         aplica_se_a=dados.get("aplica_se_a") or "ambos",
                         conteudo_padrao=dados.get("conteudo_padrao") or {}, versao=int(dados.get("versao") or 1))
    db.add(b); db.commit(); db.refresh(b)
    return _bloco_out(b)


@router.patch("/blocos/{bid}")
def atualizar_bloco(bid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    b = db.query(PropContentBlock).filter(PropContentBlock.id == bid).first()
    if not b: raise HTTPException(404, "Bloco nao encontrado")
    for k in ("chave", "titulo", "aplica_se_a", "conteudo_padrao"):
        if k in dados: setattr(b, k, dados[k])
    if "conteudo_padrao" in dados: b.versao = (b.versao or 1) + 1
    db.commit(); db.refresh(b)
    return _bloco_out(b)


# ---------- Propostas ----------
def _apply_grupos(db, prop_id, grupos):
    db.query(PropGrupo).filter(PropGrupo.proposta_id == prop_id).delete()
    db.flush()
    for gi, g in enumerate(grupos or []):
        grp = PropGrupo(proposta_id=prop_id, categoria=g.get("categoria"), moeda=g.get("moeda") or "BRL",
                        descritivo_unidade=g.get("descritivo_unidade"),
                        periodo_locacao_meses=g.get("periodo_locacao_meses"),
                        ordem=g.get("ordem") if g.get("ordem") is not None else gi)
        db.add(grp); db.flush()
        for ii, it in enumerate(g.get("itens") or []):
            db.add(PropItem(grupo_id=grp.id, produto_id=it.get("produto_id"), codigo_produto=it.get("codigo_produto"),
                            info_adicional=it.get("info_adicional"), quantidade=float(it.get("quantidade") or 0),
                            valor_unitario=float(it.get("valor_unitario") or 0),
                            margem_percentual=float(it.get("margem_percentual") or 0),
                            ordem=it.get("ordem") if it.get("ordem") is not None else ii))
        for pe in (g.get("perdas") or []):
            db.add(PropPerda(grupo_id=grp.id, descricao_item=pe.get("descricao_item"),
                             valor_reposicao=float(pe.get("valor_reposicao") or 0)))


@router.get("/propostas")
def listar_propostas(status: str | None = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.query(PropProposta)
    if status: q = q.filter(PropProposta.status == status)
    return [_proposta_out(p) for p in q.order_by(PropProposta.criado_em.desc()).all()]


@router.get("/propostas/{pid}")
def obter_proposta(pid: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(PropProposta).filter(PropProposta.id == pid).first()
    if not p: raise HTTPException(404, "Proposta nao encontrada")
    return _proposta_out(p)


@router.post("/propostas", status_code=201)
def criar_proposta(dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = PropProposta(tipo=dados.get("tipo") or "venda", status=dados.get("status") or "rascunho",
                     template_id=dados.get("template_id"), empresa_id=dados.get("empresa_id"),
                     pessoa_id=dados.get("pessoa_id"), data=dados.get("data"),
                     validade_dias=dados.get("validade_dias"), texto_comercial=dados.get("texto_comercial") or {},
                     moeda_padrao=dados.get("moeda_padrao") or "BRL", blocos=dados.get("blocos") or {})
    db.add(p); db.flush()
    _apply_grupos(db, p.id, dados.get("grupos"))
    db.commit(); db.refresh(p)
    return _proposta_out(p)


@router.patch("/propostas/{pid}")
def atualizar_proposta(pid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(PropProposta).filter(PropProposta.id == pid).first()
    if not p: raise HTTPException(404, "Proposta nao encontrada")
    for k in ("tipo", "status", "template_id", "empresa_id", "pessoa_id", "data", "validade_dias",
              "texto_comercial", "moeda_padrao", "blocos"):
        if k in dados: setattr(p, k, dados[k])
    if "grupos" in dados: _apply_grupos(db, pid, dados["grupos"])
    db.commit(); db.refresh(p)
    return _proposta_out(p)


@router.delete("/propostas/{pid}", status_code=204)
def deletar_proposta(pid: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(PropProposta).filter(PropProposta.id == pid).first()
    if p: db.delete(p); db.commit()
