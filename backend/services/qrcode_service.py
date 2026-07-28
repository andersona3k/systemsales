import io
import qrcode


def gerar_vcard_string(dados: dict) -> str:
    linhas = ["BEGIN:VCARD", "VERSION:3.0"]

    nome = dados.get("nome", "")
    if nome:
        linhas.append(f"FN:{nome}")
        partes = nome.split(" ", 1)
        sobrenome = partes[1] if len(partes) > 1 else ""
        linhas.append(f"N:{sobrenome};{partes[0]};;;")

    if dados.get("empresa"):
        linhas.append(f"ORG:{dados['empresa']}")
    if dados.get("cargo"):
        linhas.append(f"TITLE:{dados['cargo']}")
    if dados.get("telefone1"):
        linhas.append(f"TEL;TYPE=WORK,VOICE:{dados['telefone1']}")
    if dados.get("telefone2"):
        linhas.append(f"TEL;TYPE=CELL,VOICE:{dados['telefone2']}")
    if dados.get("email"):
        linhas.append(f"EMAIL;TYPE=WORK:{dados['email']}")
    if dados.get("website"):
        linhas.append(f"URL:{dados['website']}")
    if dados.get("endereco"):
        linhas.append(f"ADR;TYPE=WORK:;;{dados['endereco']};;;;")
    if dados.get("linkedin"):
        linhas.append(f"X-SOCIALPROFILE;TYPE=linkedin:{dados['linkedin']}")

    linhas.append("END:VCARD")
    return "\r\n".join(linhas)


def gerar_qrcode_png(vcard_string: str) -> bytes:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(vcard_string)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()
