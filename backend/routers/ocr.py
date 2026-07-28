from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from ..services.ocr_service import extrair_dados_cartao
from ..services.auth_service import get_current_user
from ..config import get_settings

router = APIRouter(prefix="/api/ocr", tags=["OCR"])
settings = get_settings()


@router.post("/extrair")
async def extrair_cartao(
    foto_frente: UploadFile = File(...),
    foto_verso: UploadFile | None = File(None),
    _: str = Depends(get_current_user),
):
    max_bytes = settings.max_image_size_mb * 1024 * 1024

    frente_bytes = await foto_frente.read()
    if len(frente_bytes) > max_bytes:
        raise HTTPException(status_code=413, detail=f"Imagem da frente excede {settings.max_image_size_mb}MB")

    verso_bytes = None
    verso_tipo = "image/jpeg"
    if foto_verso and foto_verso.filename:
        verso_bytes = await foto_verso.read()
        if len(verso_bytes) > max_bytes:
            raise HTTPException(status_code=413, detail=f"Imagem do verso excede {settings.max_image_size_mb}MB")
        verso_tipo = foto_verso.content_type or "image/jpeg"

    try:
        dados = await extrair_dados_cartao(
            frente_bytes=frente_bytes,
            frente_tipo=foto_frente.content_type or "image/jpeg",
            verso_bytes=verso_bytes,
            verso_tipo=verso_tipo,
        )
        return {"sucesso": True, "dados": dados}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        return {"sucesso": False, "erro": str(e), "dados": {}}
