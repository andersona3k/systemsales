import os
import re
from google.cloud import vision

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/opt/cardbase/google-credentials.json"

# Palavras que denunciam EMPRESA (nunca nome de pessoa)
SUFIXOS_EMPRESA = r'\b(ltda|me|epp|eireli|s\.?a\.?|inc|corp|group|grupo|holding|associa|associados|assessoria|instituto|funda|col[eé]gio|escola|cl[ií]nica|consultoria|tecnologia|sistemas|inform[aá]tica|digital|marketing|publicidade|solu[cç][oõ]es|servi[cç]os|com[eé]rcio|comercial|ind[uú]stria|atacado|varejo|distribuidora|gest[aã]o|engenharia|arquitetura|contabilidade|cont[aá]bil|advocacia|advogados|corretora|imobili[aá]ria|im[oó]veis|transportes|transportadora|log[ií]stica|construtora|incorporadora|empreendimentos|farm[aá]cia|[oó]ptica|restaurante|representa[cç][oõ]es|agropecu[aá]ria|cooperativa|seguros|materiais|equipamentos|ferramentas|autom[oó]veis|ve[ií]culos|laborat[oó]rio|hospital)\b'

CARGOS = [
    "diretor","diretora","gerente","analista","coordenador","coordenadora",
    "supervisor","supervisora","engenheiro","engenheira","consultor","consultora",
    "desenvolvedor","desenvolvedora","vendedor","vendedora","representante",
    "sócio","sócia","CEO","CTO","CFO","COO","presidente","assistente",
    "técnico","técnica","especialista","advogado","advogada","contador","contadora",
    "arquiteto","arquiteta","médico","médica","dentista","psicólogo","psicóloga",
    "professor","professora","pesquisador","pesquisadora","designer","programador",
    "programadora","gestor","gestora","head","manager","partner","associate",
    "proprietário","proprietária","sócio-proprietário","executivo","executiva",
]

DOMINIOS_GENERICOS = {"gmail.com","hotmail.com","yahoo.com","outlook.com","icloud.com","live.com","uol.com.br","bol.com.br","terra.com.br","ig.com.br"}

# DDDs válidos do Brasil (oficial)
DDD_BR = {
    "11","12","13","14","15","16","17","18","19",
    "21","22","24","27","28",
    "31","32","33","34","35","37","38",
    "41","42","43","44","45","46","47","48","49",
    "51","53","54","55",
    "61","62","63","64","65","66","67","68","69",
    "71","73","74","75","77","79",
    "81","82","83","84","85","86","87","88","89",
    "91","92","93","94","95","96","97","98","99",
}

# Códigos de país (para detectar estrangeiro por prefixo). BR=55.
PAISES_CODES = {
    "1","7","20","27","30","31","32","33","34","36","39","40","41","43","44","45","46",
    "47","48","49","51","52","53","54","55","56","57","58","60","61","62","63","64","65",
    "66","81","82","84","86","90","91","92","93","94","95","98",
    "212","213","216","218","220","233","234","244","254","255","258",
    "350","351","352","353","354","355","356","357","358","359",
    "380","385","386","420","421",
    "590","591","592","593","594","595","596","597","598","599",
    "852","853","855","886","971","972","973","974","975","976","977","998",
}

# Primeiros-nomes brasileiros mais comuns (base local, sem API). Expansível.
NOMES_BR = set((
    "joão jose josé antonio antônio francisco carlos paulo pedro lucas luiz luis marcos gabriel rafael "
    "daniel marcelo bruno eduardo felipe rodrigo mateus matheus andre andré fernando fabio fábio leonardo "
    "gustavo jorge mario mário alexandre ricardo sergio sérgio thiago tiago roberto adriano guilherme vitor "
    "victor diego wesley anderson alex sandro marcio márcio wagner william willian renato robson claudio cláudio "
    "cristiano douglas vinicius vinícius caio igor henrique arthur davi samuel enzo miguel bernardo heitor theo "
    "gael ravi joaquim benicio benício murilo otavio otávio nicolas isaac pietro augusto caua cauã emanuel levi "
    "edson evandro elias everton gilberto hugo ivan jonas julio júlio leandro moacir nelson osvaldo reginaldo "
    "sidnei valdir vanderlei wilson aldo ademir jefferson gilmar geraldo valter walter cezar cesar césar sebastiao "
    "sebastião raimundo manoel manuel benedito lauro noel joel jair juarez waldir "
    "maria ana francisca antonia antônia adriana juliana marcia márcia fernanda patricia patrícia aline sandra "
    "camila amanda bruna jessica jéssica leticia letícia julia júlia luciana vanessa mariana gabriela valeria valéria "
    "cristiane claudia cláudia priscila larissa carla andrea andréa denise michele michelle tatiane tatiana viviane "
    "simone luana beatriz raquel rafaela isabela isabella manuela laura luiza sophia sofia helena valentina alice "
    "cecilia cecília eloa eloá heloisa heloísa giovanna mel maite maitê lorena livia lívia yasmin esther elisa "
    "antonella catarina milena clarice rebeca marina debora débora daniela elaine eliane fabiana kelly karina katia kátia "
    "lucia lúcia monica mônica natalia natália nathalia nathália paula poliana renata roberta rosana sonia sônia sueli "
    "tania tânia vera cintia cíntia gisele jaqueline joana lidiane marta monique silvana solange vania vânia celia célia "
    "carolina carol bianca sabrina thais thaís wanessa flavia flávia regina rita neusa ivone terezinha aparecida"
).split())


def _titulo(texto: str) -> str:
    return " ".join(p.capitalize() for p in texto.split())


def _empresa_do_dominio(dominio: str) -> str:
    base = dominio
    for sufixo in [".com.br",".com",".net",".org",".br",".io"]:
        base = base.replace(sufixo, "")
    partes = base.split(".")
    return partes[-1].capitalize()


def _tokens(texto: str):
    return re.findall(r"[A-Za-zÀ-ÿ]+", texto)


def _primeiro_nome_conhecido(texto: str) -> bool:
    toks = _tokens(texto)
    return bool(toks) and toks[0].lower() in NOMES_BR


def _tem_kw_empresa(texto: str) -> bool:
    return bool(re.search(SUFIXOS_EMPRESA, texto, re.I))


# ---------- TELEFONE (país + DDD) ----------
def _fmt_br(nac: str) -> str:
    ddd, num = nac[:2], nac[2:]
    if len(num) == 9:
        return f"+55 ({ddd}) {num[:5]}-{num[5:]}"
    if len(num) == 8:
        return f"+55 ({ddd}) {num[:4]}-{num[4:]}"
    return f"+55 ({ddd}) {num}"


def _agrupa(nac: str) -> str:
    if len(nac) > 8:
        return f"{nac[:2]} {nac[2:-4]}-{nac[-4:]}".strip()
    return nac


def _detecta_pais(digits: str):
    for L in (3, 2, 1):
        cc = digits[:L]
        if cc in PAISES_CODES:
            return cc, digits[L:]
    return None, digits


def _normalizar_fone(raw: str) -> str:
    raw = raw.strip()
    tem_mais = raw.startswith("+") or raw.startswith("00")
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("00"):
        digits = digits[2:]
        tem_mais = True
    # BR com código de país
    if digits.startswith("55") and len(digits) in (12, 13) and digits[2:4] in DDD_BR:
        return _fmt_br(digits[2:])
    # BR local (sem +): 10/11 dígitos com DDD válido
    if not tem_mais and len(digits) in (10, 11) and digits[:2] in DDD_BR:
        return _fmt_br(digits)
    # Estrangeiro: tem "+" ou é longo demais p/ ser BR local
    if tem_mais or len(digits) >= 12:
        cc, nac = _detecta_pais(digits)
        if cc == "55" and len(nac) in (10, 11) and nac[:2] in DDD_BR:
            return _fmt_br(nac)
        if cc:
            return f"+{cc} {_agrupa(nac)}"
    # fallback: DDD válido -> assume BR
    if len(digits) in (10, 11) and digits[:2] in DDD_BR:
        return _fmt_br(digits)
    return raw


def _extrair_fones(texto: str, excluir=None) -> list:
    excluir = excluir or set()
    cand = re.findall(r"(?:\+|00)?[\d][\d().\s\-]{8,18}\d", texto)
    out, vistos = [], set()
    for c in cand:
        dg = re.sub(r"\D", "", c)
        if len(dg) < 10 or len(dg) > 13:
            continue
        if dg in excluir:
            continue
        norm = _normalizar_fone(c)
        key = re.sub(r"\D", "", norm)
        if key and key not in vistos:
            vistos.add(key)
            out.append(norm)
    return out[:2]


def _extrair_texto(image_bytes: bytes) -> str:
    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=image_bytes)
    response = client.document_text_detection(image=image)
    if response.error.message:
        raise Exception(f"Google Vision erro: {response.error.message}")
    return response.full_text_annotation.text if response.full_text_annotation else ""


# ---------- SCORING nome x empresa ----------
def _score_pessoa(linha: str, email_local: str) -> int:
    if re.search(r"\d", linha) or re.search(r"[&/@]", linha):
        return -100
    if _tem_kw_empresa(linha):
        return -100
    toks = linha.split()
    s = 0 if 2 <= len(toks) <= 4 else -5
    if _primeiro_nome_conhecido(linha):
        s += 5
    if all(p[:1].isupper() for p in toks if len(p) > 2):
        s += 1
    tk = _tokens(linha)
    if email_local and tk and tk[0].lower() in email_local:
        s += 3
    return s


def _score_empresa(linha: str) -> int:
    s = 0
    if _tem_kw_empresa(linha):
        s += 5
    if re.search(r"[&]", linha):
        s += 2
    if linha.isupper() and len(linha) > 3:
        s += 1
    if len(linha.split()) >= 3:
        s += 1
    if _primeiro_nome_conhecido(linha):
        s -= 3
    if re.search(r"\d", linha):
        s -= 2
    return s


def _parse_campos(texto: str) -> dict:
    linhas = [l.strip() for l in texto.splitlines() if l.strip()]

    email_re = re.compile(r"[\w.+-]+@[\w-]+\.[a-z]{2,}", re.I)
    url_re = re.compile(r"(https?://[\w\./\-\?=&%]+|www\.[\w\./\-\?=&%]+\.[a-z]{2,}[\w\./\-\?=&%]*)", re.I)
    cnpj_re = re.compile(r"\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\/\s]?\d{4}[\-\s]?\d{2}")
    cpf_re = re.compile(r"\b\d{3}[\.\s]\d{3}[\.\s]\d{3}[\-\s]\d{2}\b")

    emails = email_re.findall(texto)
    urls_raw = url_re.findall(texto)
    urls = []
    for u in urls_raw:
        if not u.startswith("http"):
            u = "https://" + u
        if len(u) > 10:
            urls.append(u)
    cnpj = cnpj_re.findall(texto)
    cpf = cpf_re.findall(texto)

    excluir = set(re.sub(r"\D", "", x) for x in (cpf + cnpj))
    fones = _extrair_fones(texto, excluir)

    email_local = emails[0].split("@")[0].lower() if emails else ""

    empresa_do_email = ""
    website_do_email = ""
    for email in emails:
        dominio = email.split("@")[1].lower()
        if dominio not in DOMINIOS_GENERICOS:
            website_do_email = "https://www." + dominio
            empresa_do_email = _empresa_do_dominio(dominio)
            break

    cargo = ""
    linhas_usadas = set()

    for linha in linhas:
        ll = linha.lower()
        if any(k.lower() in ll for k in CARGOS) and not cargo:
            cargo = linha
            linhas_usadas.add(linha)

    for linha in linhas:
        if linha in linhas_usadas:
            continue
        if email_re.search(linha) or url_re.search(linha):
            linhas_usadas.add(linha)
            continue
        digits = re.sub(r"\D", "", linha)
        if 7 <= len(digits) <= 15:
            linhas_usadas.add(linha)
            continue
        if cnpj_re.search(linha) or cpf_re.search(linha):
            linhas_usadas.add(linha)

    candidatas = [l for l in linhas if l not in linhas_usadas]

    # melhor nome (pessoa)
    nome = ""
    melhor_nome, best_p = None, 0
    for l in candidatas:
        sc = _score_pessoa(l, email_local)
        if sc > best_p:
            best_p, melhor_nome = sc, l
    if melhor_nome:
        nome = _titulo(melhor_nome)
        linhas_usadas.add(melhor_nome)

    # melhor empresa (linha diferente do nome)
    empresa = ""
    melhor_emp, best_e = None, 0
    for l in candidatas:
        if l == melhor_nome:
            continue
        sc = _score_empresa(l)
        if sc > best_e:
            best_e, melhor_emp = sc, l
    if melhor_emp and best_e >= 3:
        empresa = melhor_emp
        linhas_usadas.add(melhor_emp)
    if not empresa and empresa_do_email:
        empresa = empresa_do_email

    website_final = urls[0] if urls else website_do_email

    endereco_linhas = []
    end_kw = re.compile(r'\b(rua|av|avenida|alameda|travessa|estrada|rodovia|bloco|cep|bairro|cidade|estado|sp|sc|rj|mg|pr|rs|ba|go|df)\b', re.I)
    for linha in linhas:
        if linha in linhas_usadas:
            continue
        if end_kw.search(linha):
            endereco_linhas.append(linha)
            linhas_usadas.add(linha)

    return {
        "nome": nome,
        "empresa_nome": empresa,
        "cargo": cargo,
        "email": emails[0] if emails else "",
        "telefone1": fones[0] if fones else "",
        "telefone2": fones[1] if len(fones) > 1 else "",
        "website": website_final,
        "endereco": "\n".join(endereco_linhas),
        "cpf": cpf[0] if cpf else "",
        "cnpj": cnpj[0] if cnpj else "",
        "notas": f"Texto OCR:\n{texto[:800]}",
    }


async def extrair_dados_cartao(
    frente_bytes: bytes,
    frente_tipo: str = "image/jpeg",
    verso_bytes: bytes | None = None,
    verso_tipo: str = "image/jpeg",
) -> dict:
    texto = _extrair_texto(frente_bytes)
    if verso_bytes:
        texto += "\n" + _extrair_texto(verso_bytes)
    return _parse_campos(texto)

# --- override final: telefone robusto (junta quebras curtas, separa multi-número, colchetes) ---
FONE_LABEL = re.compile(r'\b(tel|telefone|fone|cel|celular|phone|mobile|m[oó]vil|movil|whats?app|wpp|fax|contato)\b', re.I)
_FONE_SPLIT = re.compile(r'\s{2,}|[|;]|\bfax\b|\btel\b|\bcel\b|\bphone\b|\bfone\b|\bwhats?app\b', re.I)
_FONE_CAND = re.compile(r"(?:\+|00)?\d[\d()\[\]\.\s\-]{5,16}\d")

def _juntar_quebras(linhas):
    res = []
    for l in linhas:
        s = l.strip()
        if res and re.fullmatch(r'\d{1,4}', s) and re.search(r'\d\s*$', res[-1]):
            res[-1] = res[-1].rstrip() + s
        else:
            res.append(l)
    return res

def _extrair_fones(texto, excluir=None):
    excluir = excluir or set()
    out, vistos = [], set()
    for linha in _juntar_quebras(texto.splitlines()):
        minlen = 8 if FONE_LABEL.search(linha) else 10
        for pedaco in _FONE_SPLIT.split(linha):
            for c in _FONE_CAND.findall(pedaco):
                dg = re.sub(r"\D", "", c)
                if len(dg) < minlen or len(dg) > 14:
                    continue
                if dg in excluir:
                    continue
                norm = _normalizar_fone(c)
                key = re.sub(r"\D", "", norm)
                if key and key not in vistos:
                    vistos.add(key)
                    out.append(norm)
    return out[:2]
