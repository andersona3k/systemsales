import sys
sys.path.insert(0, '/opt/cardbase')
import openpyxl
from backend.database import SessionLocal
from backend.models.cerveja import Cerveja
from sqlalchemy import text as satext

def norm(v): return ((str(v).strip() if v is not None else '') or None)
def toint(v):
    try:
        if v is None or str(v).strip()=='' : return None
        return int(float(str(v).replace(',','.').strip()))
    except: return None

wb=openpyxl.load_workbook('/opt/cardbase/imp_cervejas.xlsx', data_only=True)
ws=wb.active
rows=list(ws.iter_rows(values_only=True))
headers=[(norm(h) or '') for h in rows[0]]
def col(name):
    for i,h in enumerate(headers):
        if h.lower().strip()==name.lower(): return i
    return -1
M={'numero':col('Nº'),'cerveja':(col('Nome') if col('Nome')>=0 else col('Cerveja')),'classe':col('Classe'),'estilo':col('Estilo'),
   'embalagem':col('Embalagem'),'fabricacao':col('Fabricação'),'fabricante':col('Fabricante'),
   'cidade':col('Cidade'),'estado':col('Estado'),'pais':col('País'),'onde_bebi':col('Onde Bebi'),
   'nota':col('Nota'),'comentario_interno':col('Comentário Interno'),'legenda':col('Legenda'),
   'status':col('Status'),'observacao':col('Observação')}
db=SessionLocal()
existentes={c.numero for c in db.query(Cerveja).all() if c.numero}
novos=pulados=maxn=0
for r in rows[1:]:
    def g(k):
        i=M.get(k,-1); return r[i] if 0<=i<len(r) else None
    numero=toint(g('numero'))
    cerveja=norm(g('cerveja'))
    if not cerveja and numero is None: continue
    if numero is not None and numero in existentes: pulados+=1; continue
    kw=dict(cerveja=cerveja, classe=norm(g('classe')), estilo=norm(g('estilo')), embalagem=norm(g('embalagem')),
            fabricacao=norm(g('fabricacao')), fabricante=norm(g('fabricante')), cidade=norm(g('cidade')),
            estado=norm(g('estado')), pais=norm(g('pais')), onde_bebi=norm(g('onde_bebi')), nota=toint(g('nota')),
            comentario_interno=norm(g('comentario_interno')), legenda=norm(g('legenda')), status=norm(g('status')),
            observacao=norm(g('observacao')))
    if numero is not None: kw['numero']=numero
    db.add(Cerveja(**kw))
    if numero: existentes.add(numero); maxn=max(maxn,numero)
    novos+=1
db.commit()
if maxn:
    db.execute(satext("SELECT setval('cerveja_numero_seq', :n)").bindparams(n=maxn)); db.commit()
print('Cabecalhos:', headers)
print('Importadas:', novos, '| puladas:', pulados, '| maior numero:', maxn)
db.close()
