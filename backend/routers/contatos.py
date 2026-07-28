import os
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Body
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from uuid import UUID
from ..database import get_db
from ..models.contato import Contato, OrigemContato
from ..models.empresa import Empresa
from ..schemas.contato import ContatoCreate, ContatoUpdate, ContatoOut, ContatoListOut
from ..services.auth_service import get_current_user
from ..services.export_service import exportar_csv, exportar_xlsx, exportar_vcf, CAMPOS_DISPONIVEIS
from ..config import get_settings
from ..services.img_service import salvar_imagem
import json

router = APIRouter(prefix="/api/contatos", tags=["Contatos"])
settings = get_settings()


def _salvar_foto(arquivo, prefixo="foto"):
    return salvar_imagem(arquivo, settings.upload_dir, prefixo)


def _contato_out(contato: Contato) -> ContatoOut:
    return ContatoOut(
        id=contato.id,
        nome=contato.nome,
        empresa_id=contato.empresa_id,
        empresa_nome=contato.empresa.nome if contato.empresa else None,
        cargo=contato.cargo,
        responsavel=contato.responsavel,
        telefone1=contato.telefone1,
        telefone2=contato.telefone2,
        email=contato.email,
        website=contato.website,
        linkedin=contato.linkedin,
        instagram=contato.instagram,
        endereco=contato.endereco,
        origem=contato.origem,
        notas=contato.notas,
        foto_frente=contato.foto_frente,
        foto_verso=contato.foto_verso,
        foto_perfil=contato.foto_perfil,
        whatsapp=contato.whatsapp,
        cidade=contato.cidade,
        estado=contato.estado,
        regional=contato.regional,
        aniversario=contato.aniversario,
        tipos=contato.tipos or [],
        status=contato.status or "sem_info",
        campos_extras=contato.campos_extras or {},
        categoria_id=contato.categoria_id,
        criado_em=contato.criado_em,
        atualizado_em=contato.atualizado_em,
    )


@router.get("", response_model=dict)
def listar_contatos(
    q: str | None = None,
    categoria_id: UUID | None = None,
    empresa_id: UUID | None = None,
    origem: str | None = None,
    tipo: str | None = None,
    cidade: str | None = None,
    estado: str | None = None,
    status: str | None = None,
    empresa: str | None = None,
    responsavel: str | None = None,
    regional: str | None = None,
    mes: str | None = None,
    dia: str | None = None,
    sem_empresa: bool | None = None,
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=100),
    ordenar_por: str = "nome",
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    query = db.query(Contato).options(joinedload(Contato.empresa))
    if q:
        query = query.filter(
            or_(
                func.lower(Contato.nome).contains(func.lower(q)),
                func.lower(Contato.cargo).contains(func.lower(q)),
                func.lower(Contato.email).contains(func.lower(q)),
                func.lower(Contato.telefone1).contains(func.lower(q)),
            )
        )
    if categoria_id:
        query = query.filter(Contato.categoria_id == categoria_id)
    if empresa_id:
        query = query.filter(Contato.empresa_id == empresa_id)
    if origem:
        query = query.filter(Contato.origem == origem)
    if tipo:
        query = query.filter(Contato.tipos.contains([tipo]))
    if cidade:
        query = query.filter(func.lower(Contato.cidade).contains(func.lower(cidade)))
    if estado:
        query = query.filter(func.lower(Contato.estado) == func.lower(estado))
    if status:
        query = query.filter(Contato.status == status)
    if empresa:
        query = query.join(Empresa, Contato.empresa_id == Empresa.id).filter(func.lower(Empresa.nome).contains(func.lower(empresa)))
    if responsavel:
        query = query.filter(func.lower(Contato.responsavel).contains(func.lower(responsavel)))
    if regional:
        query = query.filter(Contato.regional == regional)
    if mes:
        query = query.filter(func.substr(Contato.aniversario, 6, 2) == mes)
    if dia:
        query = query.filter(func.substr(Contato.aniversario, 9, 2) == dia)
    if sem_empresa is True:
        query = query.filter(Contato.empresa_id.is_(None))
    elif sem_empresa is False:
        query = query.filter(Contato.empresa_id.isnot(None))

    campo_ordem = getattr(Contato, ordenar_por, Contato.nome)
    total = query.count()
    contatos = query.order_by(campo_ordem).offset((pagina - 1) * por_pagina).limit(por_pagina).all()

    itens = []
    for c in contatos:
        item = ContatoListOut(
            id=c.id,
            nome=c.nome,
            cargo=c.cargo,
            telefone1=c.telefone1,
            email=c.email,
            empresa_id=c.empresa_id,
            empresa_nome=c.empresa.nome if c.empresa else None,
            empresa_cnpj=c.empresa.cnpj if c.empresa else None,
            responsavel=c.responsavel,
            categoria_id=c.categoria_id,
            origem=c.origem,
            tipos=c.tipos or [],
            status=c.status or "sem_info",
            cidade=c.cidade,
            estado=c.estado,
            regional=c.regional,
            aniversario=c.aniversario,
            whatsapp=c.whatsapp,
            foto_frente=c.foto_frente,
            foto_perfil=c.foto_perfil,
            criado_em=c.criado_em,
        )
        itens.append(item)

    return {"total": total, "pagina": pagina, "por_pagina": por_pagina, "itens": [i.model_dump() for i in itens]}


@router.get("/campos-exportacao")
def campos_exportacao(_: str = Depends(get_current_user)):
    return CAMPOS_DISPONIVEIS


@router.post("/{contato_id}/foto-perfil", response_model=ContatoOut)
def upload_foto_perfil(
    contato_id: UUID,
    foto: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    contato = db.query(Contato).options(joinedload(Contato.empresa)).filter(Contato.id == contato_id).first()
    if not contato:
        raise HTTPException(status_code=404, detail="Contato não encontrado")
    contato.foto_perfil = _salvar_foto(foto, "perfil")
    db.commit()
    db.refresh(contato)
    return _contato_out(contato)


@router.patch("/{contato_id}/inline", response_model=ContatoOut)
def editar_inline(
    contato_id: UUID,
    dados: dict = Body(...),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    contato = db.query(Contato).options(joinedload(Contato.empresa)).filter(Contato.id == contato_id).first()
    if not contato:
        raise HTTPException(status_code=404, detail="Contato não encontrado")
    permitidos = {"tipos", "status", "cidade", "estado", "origem", "whatsapp", "regional", "aniversario", "responsavel", "cargo"}
    for k, v in dados.items():
        if k in permitidos:
            setattr(contato, k, v)
    db.commit()
    db.refresh(contato)
    return _contato_out(contato)


@router.get("/exportar/{formato}")
def exportar_contatos(
    formato: str,
    campos: list[str] = Query(default=list(CAMPOS_DISPONIVEIS.keys())),
    mapeamento_json: str | None = Query(None),
    q: str | None = None,
    categoria_id: UUID | None = None,
    empresa_id: UUID | None = None,
    origem: str | None = None,
    tipo: str | None = None,
    cidade: str | None = None,
    estado: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    mapeamento = json.loads(mapeamento_json) if mapeamento_json else {}
    query = db.query(Contato).options(joinedload(Contato.empresa))
    if q:
        query = query.filter(func.lower(Contato.nome).contains(func.lower(q)))
    if categoria_id:
        query = query.filter(Contato.categoria_id == categoria_id)
    if empresa_id:
        query = query.filter(Contato.empresa_id == empresa_id)
    if origem:
        query = query.filter(Contato.origem == origem)
    if tipo:
        query = query.filter(Contato.tipos.contains([tipo]))
    if cidade:
        query = query.filter(func.lower(Contato.cidade).contains(func.lower(cidade)))
    if estado:
        query = query.filter(func.lower(Contato.estado) == func.lower(estado))
    if status:
        query = query.filter(Contato.status == status)
    contatos = query.order_by(Contato.nome).all()

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    if formato == "csv":
        conteudo = exportar_csv(contatos, campos, mapeamento)
        return Response(content=conteudo, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=contatos_{timestamp}.csv"})
    elif formato == "xlsx":
        conteudo = exportar_xlsx(contatos, campos, mapeamento)
        return Response(content=conteudo,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=contatos_{timestamp}.xlsx"})
    elif formato == "vcf":
        conteudo = exportar_vcf(contatos)
        return Response(content=conteudo, media_type="text/vcard",
            headers={"Content-Disposition": f"attachment; filename=contatos_{timestamp}.vcf"})
    else:
        raise HTTPException(status_code=400, detail="Formato inválido. Use: csv, xlsx ou vcf")


@router.get("/{contato_id}", response_model=ContatoOut)
def obter_contato(
    contato_id: UUID,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    contato = db.query(Contato).options(joinedload(Contato.empresa)).filter(Contato.id == contato_id).first()
    if not contato:
        raise HTTPException(status_code=404, detail="Contato não encontrado")
    return _contato_out(contato)


@router.post("", response_model=ContatoOut, status_code=201)
def criar_contato(
    dados: str = Form(...),
    foto_frente: UploadFile | None = File(None),
    foto_verso: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    dados_dict = json.loads(dados)
    contato_data = ContatoCreate(**dados_dict)
    contato = Contato(**contato_data.model_dump())

    if foto_frente and foto_frente.filename:
        contato.foto_frente = _salvar_foto(foto_frente, "frente")
    if foto_verso and foto_verso.filename:
        contato.foto_verso = _salvar_foto(foto_verso, "verso")

    db.add(contato)
    db.commit()
    db.refresh(contato)
    return _contato_out(contato)


@router.put("/{contato_id}", response_model=ContatoOut)
def atualizar_contato(
    contato_id: UUID,
    dados: str = Form(...),
    foto_frente: UploadFile | None = File(None),
    foto_verso: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    contato = db.query(Contato).filter(Contato.id == contato_id).first()
    if not contato:
        raise HTTPException(status_code=404, detail="Contato não encontrado")

    dados_dict = json.loads(dados)
    update_data = ContatoUpdate(**dados_dict)
    for campo, valor in update_data.model_dump(exclude_unset=True).items():
        setattr(contato, campo, valor)

    if foto_frente and foto_frente.filename:
        contato.foto_frente = _salvar_foto(foto_frente, "frente")
    if foto_verso and foto_verso.filename:
        contato.foto_verso = _salvar_foto(foto_verso, "verso")

    db.commit()
    db.refresh(contato)
    return _contato_out(contato)


@router.delete("/{contato_id}", status_code=204)
def deletar_contato(
    contato_id: UUID,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    contato = db.query(Contato).filter(Contato.id == contato_id).first()
    if not contato:
        raise HTTPException(status_code=404, detail="Contato não encontrado")
    db.delete(contato)
    db.commit()
