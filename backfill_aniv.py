import csv, re, io
from backend.database import SessionLocal
from backend.models.contato import Contato

FILES=['/opt/cardbase/import_outlook.csv','/opt/cardbase/import_google.csv']

def read_rows(path):
    for enc in ('utf-8-sig','cp1252','latin-1'):
        try:
            data=open(path,encoding=enc,newline='').read()
            delim=';' if data.count(';')>=data.count(',') else ','
            return list(csv.DictReader(io.StringIO(data),delimiter=delim))
        except Exception: continue
    return []

def norm_wa(raw):
    if not raw: return None
    raw=re.split(r'ramal',raw,flags=re.I)[0]
    d=re.sub(r'\D','',raw).lstrip('0')
    if not d: return None
    if d.startswith('55') and len(d) in (12,13): return '+'+d
    if len(d) in (10,11): return '+55'+d
    if len(d)>=11: return '+'+d
    return None

def is_mobile(wa): return bool(wa) and wa.startswith('+55') and len(wa)==14 and wa[5]=='9'

def gather(row):
    out=[]; seen=set()
    for k,v in row.items():
        if k and 'Phone' in k and v:
            for part in v.split(':::'):
                w=norm_wa(part)
                if w and w not in seen: seen.add(w); out.append(w)
    return out

def parse_bday(v):
    if not v: return None
    v=v.strip()
    m=re.match(r'^-{0,2}(\d{4})-(\d{2})-(\d{2})$',v)
    if m: return '%s-%s-%s'%(m.group(1),m.group(2),m.group(3))
    m=re.match(r'^--(\d{2})-(\d{2})$',v)
    if m: return '0000-%s-%s'%(m.group(1),m.group(2))
    m=re.match(r'^(\d{1,2})/(\d{1,2})/(\d{2,4})$',v)
    if m:
        mo,da,yr=m.group(1),m.group(2),m.group(3)
        if len(yr)==2: yr=('19'+yr) if int(yr)>30 else ('20'+yr)
        return '%04d-%02d-%02d'%(int(yr),int(mo),int(da))
    m=re.match(r'^(\d{1,2})/(\d{1,2})$',v)
    if m: return '0000-%02d-%02d'%(int(m.group(1)),int(m.group(2)))
    return None

db=SessionLocal()
by_wa={}; by_mail={}
for c in db.query(Contato).all():
    if c.whatsapp: by_wa[c.whatsapp]=c
    if c.email: by_mail[c.email.lower()]=c

upd=0
for path in FILES:
    for row in read_rows(path):
        bday=parse_bday(row.get('Birthday'))
        if not bday: continue
        fones=gather(row)
        wa=next((f for f in fones if is_mobile(f)), None) or (fones[0] if fones else None)
        email=''
        for k in ('E-mail Address','E-mail 1 - Value','E-mail 2 Address','E-mail 2 - Value'):
            if row.get(k): email=row[k].strip().lower(); break
        c=by_wa.get(wa) or by_mail.get(email)
        if c and not c.aniversario:
            c.aniversario=bday; upd+=1
db.commit()
print('Aniversarios preenchidos:',upd)
db.close()
