import openpyxl, re, datetime
from backend.database import SessionLocal
from backend.models.empresa import Empresa

def norm(s): return (str(s).strip() if s is not None else '')
def limpa_sit(v):
    v=norm(v); low=v.lower()
    if not v: return None
    if 'perdid' in low: return 'Lead Perdido'
    if 'ex' in low and 'client' in low: return 'Ex Cliente'
    if 'ativo' in low: return 'Ativo'
    if 'lead' in low: return 'Lead'
    return re.sub(r'^[^\wÀ-ÿ]+','',v).strip() or None
def parse_data(v):
    if v in (None,''): return None
    if isinstance(v,(datetime.datetime,datetime.date)): return v.strftime('%Y-%m-%d')
    s=norm(v)
    for fmt in ('%d/%m/%Y','%Y-%m-%d','%d-%m-%Y'):
        try: return datetime.datetime.strptime(s,fmt).strftime('%Y-%m-%d')
        except: pass
    return None

wb=openpyxl.load_workbook('/opt/cardbase/imp_empresas.xlsx', data_only=True)
ws=wb.active
rows=list(ws.iter_rows(values_only=True))
headers=[norm(h) for h in rows[0]]
def col(name):
    for i,h in enumerate(headers):
        if h.lower()==name.lower(): return i
    return -1
ci={k:col(k) for k in ['Nome','Razão social','CNPJ','Status','Situação','Responsável','Data do Último contato','Segmento','Cidade']}

db=SessionLocal()
empresas={e.nome.strip().lower():e for e in db.query(Empresa).all()}
atual=criadas=0
for r in rows[1:]:
    def get(k):
        i=ci.get(k,-1); return norm(r[i]) if 0<=i<len(r) else ''
    nome=get('Nome')
    if not nome: continue
    e=empresas.get(nome.lower())
    if not e:
        e=Empresa(nome=nome); db.add(e); empresas[nome.lower()]=e; criadas+=1
    else:
        atual+=1
    e.razao_social=get('Razão social') or e.razao_social
    e.cnpj=get('CNPJ') or e.cnpj
    e.status=get('Status') or e.status
    e.situacao=limpa_sit(get('Situação')) or e.situacao
    e.responsavel=get('Responsável') or e.responsavel
    e.data_ultimo_contato=parse_data(get('Data do Último contato')) or e.data_ultimo_contato
    e.segmento=get('Segmento') or e.segmento
    e.cidade=get('Cidade') or e.cidade
db.commit()
print('Cabeçalhos lidos:', headers)
print('Empresas atualizadas:',atual,'| criadas:',criadas)
db.close()
