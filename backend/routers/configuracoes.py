from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.configuracao import Configuracao
from ..schemas.configuracao import ConfiguracaoUpsert
from ..services.auth_service import get_current_user
from ..services.qrcode_service import gerar_vcard_string, gerar_qrcode_png
from ..config import get_settings

router = APIRouter(prefix="/api/configuracoes", tags=["Configurações"])
settings = get_settings()


@router.get("/{chave}")
def obter_configuracao(
    chave: str,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    cfg = db.query(Configuracao).filter(Configuracao.chave == chave).first()
    if not cfg:
        return {"chave": chave, "valor": None}
    return {"chave": cfg.chave, "valor": cfg.valor}


@router.put("/{chave}")
def salvar_configuracao(
    chave: str,
    dados: ConfiguracaoUpsert,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    cfg = db.query(Configuracao).filter(Configuracao.chave == chave).first()
    if cfg:
        cfg.valor = dados.valor
    else:
        cfg = Configuracao(chave=chave, valor=dados.valor)
        db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return {"chave": cfg.chave, "valor": cfg.valor}


@router.get("/qrcode/imagem")
def gerar_qrcode(
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    cfg = db.query(Configuracao).filter(Configuracao.chave == "meu_cartao").first()
    dados = cfg.valor if cfg and cfg.valor else {}
    vcard = gerar_vcard_string(dados)
    png = gerar_qrcode_png(vcard)
    return Response(content=png, media_type="image/png")


@router.get("/api-key/testar")
def testar_api_key(_: str = Depends(get_current_user)):
    if not settings.anthropic_api_key:
        return {"ok": False, "mensagem": "Chave não configurada"}
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=10,
            messages=[{"role": "user", "content": "ping"}],
        )
        return {"ok": True, "mensagem": "Conexão bem-sucedida"}
    except Exception as e:
        return {"ok": False, "mensagem": str(e)}
