from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class GaleriaCreate(BaseModel):
    titulo: str | None = None


class GaleriaOut(BaseModel):
    id: UUID
    titulo: str | None = None
    imagens: list[str] = []
    criado_em: datetime

    class Config:
        from_attributes = True
