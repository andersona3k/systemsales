from datetime import datetime
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.prospeccao import ProspEmpresa, ProspPessoa, ProspLista, ProspCard, ProspAtividade, ChecklistTemplate, CrmRegistro
from ..schemas.prospeccao import (
    ProspEmpresaIn, ProspEmpresaOut, ProspPessoaIn, ProspPessoaOut,
    ProspListaIn, ProspListaOut, ProspListaAddEmpresasIn,
    ProspAtividadeIn, ProspAtividadeOut, ProspCardOut, ChecklistTemplateIn, ChecklistTemplateOut,
)
from ..services.auth_service import get_current_user
from ..services.prospeccao_export import (
    ler_planilha, normalizar_status, normalizar_linkedin_status, telefone_valido,
    exportar_empresas_csv, exportar_empresas_xlsx, exportar_pessoas_csv, exportar_pessoas_xlsx,
)

router = APIRouter(prefix="/api/prospeccao", tags=["Prospeccao"])

BOARDS = {
    "mapeamento": ["Lista importada", "Pesquisa em andamento", "Contato mapeado", "Enviado p/ cadência"],
    "social": ["Alvo definido", "Conexão enviada", "Conectado", "Engajamento", "Gancho identificado", "Icebreaker enviado", "Conversa iniciada", "Resposta recebida"],
    "direto": ["Novo", "Tentativa 1", "Tentativa 2", "Tentativa 3", "Engajado", "Reunião agendada"],
    "reativacao": ["Identificado", "Contato 1", "Contato 2", "Contato 3", "Reengajado", "Arquivo Morto"],
    "lead": ["Entrada", "Registro no CRM", "CRM OK"],
}

# pra qual(is) funil(is) um card pode ser movido manualmente, a partir do funil atual
BOARD_DESTINOS = {
    "mapeamento": ["social", "direto", "lead"],
    "social": ["direto", "lead"],
    "direto": ["social", "lead"],
    "reativacao": ["lead"],
}


def _pessoa_out(p: ProspPessoa) -> dict:
    return {
        "id": p.id, "empresa_id": p.empresa_id, "nome": p.nome,
        "linkedin_status": p.linkedin_status, "linkedin_url": p.linkedin_url,
        "telefone": p.telefone, "email": p.email, "setor": p.setor, "cargo": p.cargo,
        "empresa_nome": p.empresa.nome if p.empresa else None,
    }


def _empresa_out(e: ProspEmpresa) -> dict:
    return {
        "id": e.id, "nome": e.nome, "cnpj": e.cnpj, "segmento": e.segmento,
        "estado": e.estado, "cidade": e.cidade,
        "website": e.website, "instagram": e.instagram, "linkedin_url": e.linkedin_url,
        "origem": e.origem, "status": e.status or "novo",
        "criado_em": e.criado_em, "total_pessoas": len(e.pessoas), "tem_lista": len(e.listas) > 0,
        "pessoas": [_pessoa_out(p) for p in e.pessoas],
    }


def _lista_out(l: ProspLista) -> dict:
    return {
        "id": l.id, "nome": l.nome, "tipo": l.tipo, "linha_atuacao": l.linha_atuacao,
        "filtros_json": l.filtros_json or {},
        "checklist_modo": l.checklist_modo or "nenhum",
        "checklist_template_id": l.checklist_template_id,
        "checklist_por_etapa": l.checklist_por_etapa or {},
        "criado_em": l.criado_em,
        "total_empresas": len(l.empresas), "empresas": [_empresa_out(e) for e in l.empresas],
    }


def _atividade_out(a: ProspAtividade) -> dict:
    return {"id": a.id, "tipo": a.tipo, "texto": a.texto, "data_hora": a.data_hora}


def _card_out(c: ProspCard) -> dict:
    dias = (datetime.utcnow() - c.data_entrada_etapa).days if c.data_entrada_etapa else 0
    return {
        "id": c.id, "empresa_id": c.empresa_id, "lista_id": c.lista_id,
        "board": c.board, "etapa": c.etapa, "sinaleiro": c.sinaleiro,
        "checklist_state": c.checklist_state or {}, "data_entrada_etapa": c.data_entrada_etapa,
        "arquivado": c.arquivado, "criado_em": c.criado_em, "dias_na_etapa": dias,
        "empresa": _empresa_out(c.empresa) if c.empresa else None,
        "lista_nome": c.lista.nome if c.lista else None,
        "lista_tipo": c.lista.tipo if c.lista else None,
        "lista_linha_atuacao": c.lista.linha_atuacao if c.lista else None,
        "atividades": [_atividade_out(a) for a in c.atividades],
    }


@router.get("/empresas", response_model=List[ProspEmpresaOut])
def listar_empresas(segmento: str | None = None, estado: str | None = None, cidade: str | None = None,
                     sem_lista: bool | None = None, status: str | None = None, limit: int = 20, offset: int = 0,
                     db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.query(ProspEmpresa)
    if segmento: q = q.filter(ProspEmpresa.segmento == segmento)
    if estado: q = q.filter(ProspEmpresa.estado == estado)
    if cidade: q = q.filter(ProspEmpresa.cidade == cidade)
    if sem_lista: q = q.filter(~ProspEmpresa.listas.any())
    if status: q = q.filter(ProspEmpresa.status == status)
    empresas = q.order_by(ProspEmpresa.nome).offset(offset).limit(limit).all()
    return [_empresa_out(e) for e in empresas]


@router.get("/empresas/exportar/{formato}")
def exportar_empresas(formato: str, vazio: bool = False, segmento: str | None = None, estado: str | None = None,
                       cidade: str | None = None, status: str | None = None,
                       db: Session = Depends(get_db), _=Depends(get_current_user)):
    empresas = []
    if not vazio:
        q = db.query(ProspEmpresa)
        if segmento: q = q.filter(ProspEmpresa.segmento == segmento)
        if estado: q = q.filter(ProspEmpresa.estado == estado)
        if cidade: q = q.filter(ProspEmpresa.cidade == cidade)
        if status: q = q.filter(ProspEmpresa.status == status)
        empresas = q.order_by(ProspEmpresa.nome).all()
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    if formato == "csv":
        conteudo = exportar_empresas_csv(empresas)
        return Response(content=conteudo, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=empresas_{timestamp}.csv"})
    elif formato == "xlsx":
        conteudo = exportar_empresas_xlsx(empresas)
        return Response(content=conteudo,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=empresas_{timestamp}.xlsx"})
    else:
        raise HTTPException(400, "Formato inválido. Use csv ou xlsx")


@router.post("/empresas/importar")
async def importar_empresas(arquivo: UploadFile = File(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    conteudo = await arquivo.read()
    linhas = ler_planilha(conteudo, arquivo.filename)
    existentes = db.query(ProspEmpresa).all()
    by_cnpj = {e.cnpj.strip(): e for e in existentes if e.cnpj and e.cnpj.strip()}
    by_nome = {e.nome.strip().lower(): e for e in existentes if not (e.cnpj and e.cnpj.strip())}
    criadas = duplicadas = invalidas = 0
    for linha in linhas:
        nome = (linha.get("Nome") or "").strip()
        cnpj = (linha.get("CNPJ") or "").strip()
        if not nome and not cnpj:
            invalidas += 1
            continue
        if cnpj:
            if cnpj in by_cnpj:
                duplicadas += 1
                continue
        else:
            if nome.lower() in by_nome:
                duplicadas += 1
                continue
        nova = ProspEmpresa(
            nome=nome or cnpj,
            cnpj=cnpj or None,
            segmento=(linha.get("Segmento") or "").strip() or None,
            estado=(linha.get("Estado") or "").strip() or None,
            cidade=(linha.get("Cidade") or "").strip() or None,
            website=(linha.get("Website") or "").strip() or None,
            instagram=(linha.get("Instagram") or "").strip() or None,
            linkedin_url=(linha.get("LinkedIn") or "").strip() or None,
            origem=(linha.get("Origem") or "").strip() or None,
            status=normalizar_status(linha.get("Status")),
        )
        db.add(nova)
        if cnpj: by_cnpj[cnpj] = nova
        else: by_nome[nome.lower()] = nova
        criadas += 1
    db.commit()
    return {"criadas": criadas, "duplicadas": duplicadas, "invalidas": invalidas, "total_linhas": len(linhas)}


@router.post("/empresas", response_model=ProspEmpresaOut, status_code=201)
def criar_empresa(dados: ProspEmpresaIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    payload = dados.model_dump()
    payload["status"] = normalizar_status(payload.get("status"))
    e = ProspEmpresa(**payload)
    db.add(e); db.commit(); db.refresh(e)
    return _empresa_out(e)


@router.patch("/empresas/{eid}", response_model=ProspEmpresaOut)
def atualizar_empresa(eid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    e = db.query(ProspEmpresa).filter(ProspEmpresa.id == eid).first()
    if not e: raise HTTPException(404, "Empresa não encontrada")
    for k in ("nome", "cnpj", "segmento", "estado", "cidade", "website", "instagram", "linkedin_url", "origem", "status"):
        if k in dados: setattr(e, k, dados[k])
    db.commit(); db.refresh(e)
    return _empresa_out(e)


@router.delete("/empresas/{eid}", status_code=204)
def deletar_empresa(eid: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    e = db.query(ProspEmpresa).filter(ProspEmpresa.id == eid).first()
    if not e: raise HTTPException(404, "Empresa não encontrada")
    db.delete(e); db.commit()


@router.post("/empresas/{eid}/pessoas", response_model=ProspPessoaOut, status_code=201)
def criar_pessoa(eid: UUID, dados: ProspPessoaIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    e = db.query(ProspEmpresa).filter(ProspEmpresa.id == eid).first()
    if not e: raise HTTPException(404, "Empresa não encontrada")
    p = ProspPessoa(empresa_id=eid, **dados.model_dump())
    db.add(p); db.commit(); db.refresh(p)
    return _pessoa_out(p)


@router.patch("/pessoas/{pid}", response_model=ProspPessoaOut)
def atualizar_pessoa(pid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(ProspPessoa).filter(ProspPessoa.id == pid).first()
    if not p: raise HTTPException(404, "Contato não encontrado")
    for k in ("nome", "linkedin_status", "linkedin_url", "telefone", "email", "setor", "cargo"):
        if k in dados: setattr(p, k, dados[k])
    db.commit(); db.refresh(p)
    return _pessoa_out(p)


@router.delete("/pessoas/{pid}", status_code=204)
def deletar_pessoa(pid: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(ProspPessoa).filter(ProspPessoa.id == pid).first()
    if not p: raise HTTPException(404, "Contato não encontrado")
    db.delete(p); db.commit()


@router.get("/pessoas", response_model=List[ProspPessoaOut])
def listar_pessoas(db: Session = Depends(get_db), _=Depends(get_current_user)):
    pessoas = db.query(ProspPessoa).order_by(ProspPessoa.nome).all()
    return [_pessoa_out(p) for p in pessoas]


@router.get("/pessoas/exportar/{formato}")
def exportar_pessoas(formato: str, vazio: bool = False, db: Session = Depends(get_db), _=Depends(get_current_user)):
    pessoas = [] if vazio else db.query(ProspPessoa).order_by(ProspPessoa.nome).all()
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    if formato == "csv":
        conteudo = exportar_pessoas_csv(pessoas)
        return Response(content=conteudo, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=contatos_{timestamp}.csv"})
    elif formato == "xlsx":
        conteudo = exportar_pessoas_xlsx(pessoas)
        return Response(content=conteudo,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=contatos_{timestamp}.xlsx"})
    else:
        raise HTTPException(400, "Formato inválido. Use csv ou xlsx")


@router.post("/pessoas/importar")
async def importar_pessoas(arquivo: UploadFile = File(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    conteudo = await arquivo.read()
    linhas = ler_planilha(conteudo, arquivo.filename)
    empresas_by_nome = {e.nome.strip().lower(): e for e in db.query(ProspEmpresa).all()}
    dedup = {(p.empresa_id, p.nome.strip().lower()) for p in db.query(ProspPessoa).all()}
    criadas = duplicadas = invalidas = 0
    for linha in linhas:
        nome = (linha.get("Nome") or "").strip()
        empresa_nome = (linha.get("Empresa") or "").strip()
        if not nome or not empresa_nome:
            invalidas += 1
            continue
        empresa = empresas_by_nome.get(empresa_nome.lower())
        if not empresa:
            invalidas += 1
            continue
        chave = (empresa.id, nome.lower())
        if chave in dedup:
            duplicadas += 1
            continue
        telefone_bruto = (linha.get("Telefone") or "").strip()
        nova = ProspPessoa(
            empresa_id=empresa.id,
            nome=nome,
            cargo=(linha.get("Cargo") or "").strip() or None,
            setor=(linha.get("Setor") or "").strip() or None,
            telefone=telefone_bruto if telefone_valido(telefone_bruto) else None,
            email=(linha.get("Email") or "").strip() or None,
            linkedin_status=normalizar_linkedin_status(linha.get("LinkedIn Status")),
            linkedin_url=(linha.get("LinkedIn URL") or "").strip() or None,
        )
        db.add(nova)
        dedup.add(chave)
        criadas += 1
    db.commit()
    return {"criadas": criadas, "duplicadas": duplicadas, "invalidas": invalidas, "total_linhas": len(linhas)}


@router.post("/listas", response_model=ProspListaOut, status_code=201)
def criar_lista(dados: ProspListaIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    l = ProspLista(nome=dados.nome, tipo=dados.tipo, linha_atuacao=dados.linha_atuacao, filtros_json=dados.filtros_json)
    if dados.empresa_ids:
        l.empresas = db.query(ProspEmpresa).filter(ProspEmpresa.id.in_(dados.empresa_ids)).all()
    db.add(l); db.commit(); db.refresh(l)
    return _lista_out(l)


@router.get("/listas", response_model=List[ProspListaOut])
def listar_listas(db: Session = Depends(get_db), _=Depends(get_current_user)):
    listas = db.query(ProspLista).order_by(ProspLista.criado_em).all()
    return [_lista_out(l) for l in listas]


@router.get("/listas/{lid}", response_model=ProspListaOut)
def obter_lista(lid: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    l = db.query(ProspLista).filter(ProspLista.id == lid).first()
    if not l: raise HTTPException(404, "Lista não encontrada")
    return _lista_out(l)


@router.post("/listas/{lid}/empresas", response_model=ProspListaOut)
def adicionar_empresas_lista(lid: UUID, dados: ProspListaAddEmpresasIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    l = db.query(ProspLista).filter(ProspLista.id == lid).first()
    if not l: raise HTTPException(404, "Lista não encontrada")
    board = l.tipo if l.tipo in BOARDS else "mapeamento"
    etapa_inicial = BOARDS[board][0]
    if dados.empresa_ids:
        existentes = {e.id for e in l.empresas}
        novas = db.query(ProspEmpresa).filter(ProspEmpresa.id.in_(dados.empresa_ids)).all()
        for e in novas:
            if e.id not in existentes:
                l.empresas.append(e)
            ja_tem_card = db.query(ProspCard).filter(ProspCard.empresa_id == e.id, ProspCard.lista_id == lid).first()
            if not ja_tem_card:
                db.add(ProspCard(empresa_id=e.id, lista_id=lid, board=board, etapa=etapa_inicial,
                                  sinaleiro="red", data_entrada_etapa=datetime.utcnow()))
    db.commit(); db.refresh(l)
    return _lista_out(l)


@router.patch("/listas/{lid}/checklist-config", response_model=ProspListaOut)
def atualizar_checklist_config(lid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    l = db.query(ProspLista).filter(ProspLista.id == lid).first()
    if not l: raise HTTPException(404, "Lista não encontrada")
    for k in ("checklist_modo", "checklist_template_id", "checklist_por_etapa"):
        if k in dados: setattr(l, k, dados[k])
    db.commit(); db.refresh(l)
    return _lista_out(l)


@router.delete("/listas/{lid}", status_code=204)
def deletar_lista(lid: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    l = db.query(ProspLista).filter(ProspLista.id == lid).first()
    if not l: raise HTTPException(404, "Lista não encontrada")
    db.delete(l); db.commit()


@router.get("/cards", response_model=List[ProspCardOut])
def listar_cards(board: str | None = None, lista_id: UUID | None = None, produto: str | None = None,
                  db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.query(ProspCard)
    if board: q = q.filter(ProspCard.board == board)
    if lista_id: q = q.filter(ProspCard.lista_id == lista_id)
    cards = q.all()
    if produto:
        cards = [c for c in cards if c.lista and c.lista.linha_atuacao == produto]
    return [_card_out(c) for c in cards]


@router.patch("/cards/{cid}/mover-etapa", response_model=ProspCardOut)
def mover_etapa(cid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.query(ProspCard).filter(ProspCard.id == cid).first()
    if not c: raise HTTPException(404, "Card não encontrado")
    nova_etapa = dados.get("etapa")
    if nova_etapa not in BOARDS.get(c.board, []):
        raise HTTPException(400, "Etapa inválida para esse board")
    c.etapa = nova_etapa
    c.data_entrada_etapa = datetime.utcnow()
    db.add(ProspAtividade(card_id=c.id, tipo=None, texto='Movido para etapa "' + nova_etapa + '".'))
    db.commit(); db.refresh(c)
    return _card_out(c)


@router.patch("/cards/{cid}/sinaleiro", response_model=ProspCardOut)
def atualizar_sinaleiro(cid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.query(ProspCard).filter(ProspCard.id == cid).first()
    if not c: raise HTTPException(404, "Card não encontrado")
    novo = dados.get("sinaleiro")
    if novo not in ("red", "yellow", "green"):
        raise HTTPException(400, "Sinaleiro inválido")
    c.sinaleiro = novo
    labels = {"red": "Prospecção Fria", "yellow": "Interação", "green": "Comunicação"}
    db.add(ProspAtividade(card_id=c.id, tipo=None, texto='Status alterado para "' + labels[novo] + '".'))
    db.commit(); db.refresh(c)
    return _card_out(c)


@router.patch("/cards/{cid}/mover-board", response_model=ProspCardOut)
def mover_board(cid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.query(ProspCard).filter(ProspCard.id == cid).first()
    if not c: raise HTTPException(404, "Card não encontrado")
    novo_board = dados.get("board")
    if novo_board not in BOARDS:
        raise HTTPException(400, "Funil inválido")
    if novo_board not in BOARD_DESTINOS.get(c.board, []):
        raise HTTPException(400, "Esse card não pode ir do funil \"" + c.board + "\" para \"" + novo_board + "\"")
    origem = c.board + " / " + c.etapa
    c.board = novo_board
    c.etapa = BOARDS[novo_board][0]
    c.data_entrada_etapa = datetime.utcnow()
    db.add(ProspAtividade(card_id=c.id, tipo=None, texto='Movido para o funil "' + novo_board + '" (origem: ' + origem + ').'))
    db.commit(); db.refresh(c)
    return _card_out(c)


@router.patch("/cards/{cid}/arquivar", response_model=ProspCardOut)
def arquivar_card(cid: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.query(ProspCard).filter(ProspCard.id == cid).first()
    if not c: raise HTTPException(404, "Card não encontrado")
    c.arquivado = not c.arquivado
    db.add(ProspAtividade(card_id=c.id, tipo=None, texto="Card arquivado." if c.arquivado else "Card desarquivado."))
    db.commit(); db.refresh(c)
    return _card_out(c)


@router.patch("/cards/{cid}/checklist", response_model=ProspCardOut)
def atualizar_checklist_card(cid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.query(ProspCard).filter(ProspCard.id == cid).first()
    if not c: raise HTTPException(404, "Card não encontrado")
    item = dados.get("item"); concluido = bool(dados.get("concluido"))
    state = dict(c.checklist_state or {})
    state[item] = concluido
    c.checklist_state = state
    db.add(ProspAtividade(card_id=c.id, tipo=None, texto='Checklist: "' + str(item) + '" marcado como ' + ("concluído" if concluido else "pendente") + '.'))
    db.commit(); db.refresh(c)
    return _card_out(c)


@router.post("/cards/{cid}/atividades", response_model=ProspCardOut, status_code=201)
def registrar_atividade(cid: UUID, dados: ProspAtividadeIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.query(ProspCard).filter(ProspCard.id == cid).first()
    if not c: raise HTTPException(404, "Card não encontrado")
    if not dados.tipo:
        raise HTTPException(400, "Informe o tipo de canal da atividade")
    db.add(ProspAtividade(card_id=c.id, tipo=dados.tipo, texto=dados.texto))
    db.commit(); db.refresh(c)
    return _card_out(c)


@router.get("/checklist-templates", response_model=List[ChecklistTemplateOut])
def listar_checklist_templates(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(ChecklistTemplate).order_by(ChecklistTemplate.nome).all()


@router.post("/checklist-templates", response_model=ChecklistTemplateOut, status_code=201)
def criar_checklist_template(dados: ChecklistTemplateIn, db: Session = Depends(get_db), _=Depends(get_current_user)):
    t = ChecklistTemplate(nome=dados.nome, itens=dados.itens)
    db.add(t); db.commit(); db.refresh(t)
    return t


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), _=Depends(get_current_user)):
    from datetime import datetime, timedelta
    from sqlalchemy import func
    import calendar
    empresas_total = db.query(ProspEmpresa).count()
    ids_com_contato = {r[0] for r in db.query(ProspPessoa.empresa_id).distinct().all() if r[0] is not None}
    empresas_sem_contato = max(0, empresas_total - len(ids_com_contato))
    empresas_em_prospeccao = db.query(func.count(func.distinct(ProspCard.empresa_id))).filter(ProspCard.arquivado == False).scalar() or 0
    pessoas = db.query(ProspPessoa).all()
    def _tem(v): return v is not None and str(v).strip() != ""
    contatos_total = len(pessoas)
    com_tel = sum(1 for x in pessoas if _tem(x.telefone))
    com_email = sum(1 for x in pessoas if _tem(x.email))
    sem_empresa = sum(1 for x in pessoas if x.empresa_id is None)
    boards = ["mapeamento", "social", "direto", "reativacao", "lead"]
    cards_por_board = {b: 0 for b in boards}
    for b, c in db.query(ProspCard.board, func.count(ProspCard.id)).filter(ProspCard.arquivado == False).group_by(ProspCard.board).all():
        if b in cards_por_board: cards_por_board[b] = int(c)
    lista_total = db.query(ProspLista).count()
    lista_ativa = len({r[0] for r in db.query(ProspCard.lista_id).filter(ProspCard.arquivado == False).distinct().all()})
    cards_ativos = db.query(ProspCard).filter(ProspCard.arquivado == False).count()
    now = datetime.utcnow(); nb = now - timedelta(hours=3)
    hoje_br = datetime(nb.year, nb.month, nb.day)
    hoje = hoje_br + timedelta(hours=3)
    semana = (hoje_br - timedelta(days=nb.weekday())) + timedelta(hours=3)
    mes = datetime(nb.year, nb.month, 1) + timedelta(hours=3)
    prox = (datetime(nb.year + 1, 1, 1) if nb.month == 12 else datetime(nb.year, nb.month + 1, 1)) + timedelta(hours=3)
    tipos = ["email", "inmail", "whatsapp", "telefone", "reuniao", "linkedin"]
    def agg(desde):
        d = {t: 0 for t in tipos}
        q = db.query(ProspAtividade.tipo, func.count(ProspAtividade.id)).filter(
            ProspAtividade.data_hora >= desde, ProspAtividade.tipo.isnot(None)).group_by(ProspAtividade.tipo)
        for tp, c in q.all():
            if tp in d: d[tp] = int(c)
        return d
    def emp_ativ(desde):
        return db.query(func.count(func.distinct(ProspCard.empresa_id))).join(
            ProspAtividade, ProspAtividade.card_id == ProspCard.id).filter(
            ProspAtividade.data_hora >= desde, ProspAtividade.tipo.isnot(None)).scalar() or 0
    ndays = calendar.monthrange(nb.year, nb.month)[1]
    por_dia = [0] * ndays
    semanas = {}
    for (dh,) in db.query(ProspAtividade.data_hora).filter(
            ProspAtividade.data_hora >= mes, ProspAtividade.data_hora < prox,
            ProspAtividade.tipo.isnot(None)).all():
        dloc = dh - timedelta(hours=3)
        if 1 <= dloc.day <= ndays: por_dia[dloc.day - 1] += 1
        wd = dloc.weekday()
        if wd <= 4:
            monday = (dloc - timedelta(days=wd)).date()
            semanas.setdefault(monday, [0, 0, 0, 0, 0])[wd] += 1
    por_semana = [{"label": m.strftime("%d/%m"), "dias": arr} for m, arr in sorted(semanas.items())]
    empresas_novas_mes = db.query(ProspEmpresa).filter(ProspEmpresa.criado_em >= mes).count()
    contatos_novos_mes = db.query(ProspPessoa).filter(ProspPessoa.criado_em >= mes).count()
    meses_pt = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
    return {
        "empresas_total": empresas_total,
        "empresas_sem_contato": empresas_sem_contato,
        "empresas_em_prospeccao": int(empresas_em_prospeccao),
        "empresas_novas_mes": empresas_novas_mes,
        "contatos_total": contatos_total,
        "contatos_novos_mes": contatos_novos_mes,
        "contatos_com_telefone": com_tel,
        "contatos_com_email": com_email,
        "contatos_sem_empresa": sem_empresa,
        "cards_por_board": cards_por_board,
        "lista_total": lista_total,
        "lista_ativa": lista_ativa,
        "listas_ativas": lista_total,
        "cards_ativos": cards_ativos,
        "atividades": {"hoje": agg(hoje), "semana": agg(semana), "mes": agg(mes)},
        "empresas_com_atividade": {"semana": int(emp_ativ(semana)), "mes": int(emp_ativ(mes))},
        "por_dia": por_dia,
        "por_semana": por_semana,
        "mes_label": meses_pt[nb.month] + "/" + str(nb.year),
    }


def _crm_out(x):
    return {"id": str(x.id), "data": x.data.isoformat() if x.data else None,
            "tipo": x.tipo, "quantidade": x.quantidade or 1,
            "observacao": x.observacao or "", "criado_em": x.criado_em.isoformat() if x.criado_em else None}


@router.get("/crm/registros")
def crm_listar(desde: str | None = None, ate: str | None = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    from datetime import date
    q = db.query(CrmRegistro)
    if desde: q = q.filter(CrmRegistro.data >= date.fromisoformat(desde))
    if ate: q = q.filter(CrmRegistro.data <= date.fromisoformat(ate))
    return [_crm_out(x) for x in q.order_by(CrmRegistro.data.desc(), CrmRegistro.criado_em.desc()).all()]


@router.post("/crm/registros", status_code=201)
def crm_criar(dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    from datetime import date
    tipo = (dados.get("tipo") or "").strip()
    if not tipo: raise HTTPException(status_code=400, detail="Tipo obrigatorio")
    d = dados.get("data")
    x = CrmRegistro(data=date.fromisoformat(d) if d else date.today(), tipo=tipo,
                    quantidade=int(dados.get("quantidade") or 1),
                    observacao=(dados.get("observacao") or "").strip() or None)
    db.add(x); db.commit(); db.refresh(x)
    return _crm_out(x)


@router.patch("/crm/registros/{rid}")
def crm_atualizar(rid: UUID, dados: dict = Body(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    from datetime import date
    x = db.query(CrmRegistro).filter(CrmRegistro.id == rid).first()
    if not x: raise HTTPException(status_code=404, detail="Nao encontrado")
    if dados.get("data"): x.data = date.fromisoformat(dados["data"])
    if dados.get("tipo"): x.tipo = dados["tipo"].strip()
    if "quantidade" in dados: x.quantidade = int(dados.get("quantidade") or 1)
    if "observacao" in dados: x.observacao = (dados.get("observacao") or "").strip() or None
    db.commit(); db.refresh(x)
    return _crm_out(x)


@router.delete("/crm/registros/{rid}", status_code=204)
def crm_deletar(rid: UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    x = db.query(CrmRegistro).filter(CrmRegistro.id == rid).first()
    if x: db.delete(x); db.commit()
    return Response(status_code=204)
