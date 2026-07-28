import os, uuid
from io import BytesIO
from datetime import datetime
from PIL import Image
try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except Exception:
    pass


def salvar_imagem(arquivo, upload_dir, prefixo="img"):
    agora = datetime.utcnow()
    pasta = os.path.join(upload_dir, str(agora.year), f"{agora.month:02d}")
    os.makedirs(pasta, exist_ok=True)
    ext = (os.path.splitext(arquivo.filename or "img.jpg")[1] or ".jpg").lower()
    data = arquivo.file.read()
    if ext in (".heic", ".heif"):
        img = Image.open(BytesIO(data)).convert("RGB")
        nome = f"{prefixo}_{uuid.uuid4().hex}.jpg"
        caminho = os.path.join(pasta, nome)
        img.save(caminho, "JPEG", quality=90)
    else:
        nome = f"{prefixo}_{uuid.uuid4().hex}{ext}"
        caminho = os.path.join(pasta, nome)
        with open(caminho, "wb") as f:
            f.write(data)
    return caminho.replace(upload_dir, "/uploads").replace("//", "/")
