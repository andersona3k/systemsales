import csv, re, io
from backend.database import SessionLocal
from backend.models.contato import Contato
from backend.models.empresa import Empresa

FILES = [('/opt/cardbase/import_outlook.csv','outlook'),
         ('/opt/cardbase/import_google.csv','google')]

def read_rows(path):
    for enc in ('utf-8-sig','cp1252','latin-1'):
        try:
            with open(path, encoding=enc, newline='') as f:
                data = f.read()
            delim = ';' if data.count(';') >= data.count(',') else ','
            return list(csv.DictReader(io.StringIO(data), delimiter=delim))
        except Exception:
            continue
    return []

def titulo(s):
    return ' '.join(w.capitalize() for w in (s or '').split())

def norm_wa(raw):
    if not raw: return None
    raw = re.split(r'ramal', raw, flags=re.I)[0]
    d = re.sub(r'\D','', raw).lstrip('0')
    if not d: return None
    if d.startswith('55') and len(d) in (12,13): return '+'+d
    if len(d) in (10,11): return '+55'+d
    if len(d) >= 11: return '+'+d
    return None

def is_mobile(wa):
    return bool(wa) and wa.startswith('+55') and len(wa)==14 and wa[5]=='9'

def fmt(wa):
    if not wa: return None
    if wa.startswith('+55') and len(wa) in (13,14):
        ddd, rest = wa[3:5], wa[5:]
        if len(rest)==9: return f'+55 {ddd} {rest[:5]}-{rest[5:]}'
        if len(rest)==8: return f'+55 {ddd} {rest[:4]}-{rest[4:]}'
    return wa

def gather(row):
    out, seen = [], set()
    for k,v in row.items():
        if k and 'Phone' in k and v:
            for part in v.split(':::'):
                wa = norm_wa(part)
                if wa and wa not in seen:
                    seen.add(wa); out.append(wa)
    return out

db = SessionLocal()
emp_cache = {e.nome.lower(): e for e in db.query(Empresa).all()}
wa_exist = {c.whatsapp for c in db.query(Contato).all() if c.whatsapp}
mail_exist = {(c.email or '').lower() for c in db.query(Contato).all() if c.email}

def get_emp(nome):
    key = nome.lower().strip()
    if key in emp_cache: return emp_cache[key]
    e = Empresa(nome=nome.strip()); db.add(e); db.flush()
    emp_cache[key] = e
    return e

novos = pulados = 0
for path, origem in FILES:
    for row in read_rows(path):
        nome = titulo(' '.join(filter(None, [row.get('First Name'), row.get('Middle Name'), row.get('Last Name')])))
        if not nome: continue
        empresa_nome = (row.get('Company') or row.get('Organization Name') or '').strip()
        email = ''
        for k in ('E-mail Address','E-mail 1 - Value','E-mail 2 Address','E-mail 2 - Value'):
            if row.get(k): email = row[k].strip(); break
        fones = gather(row)
        wa = next((f for f in fones if is_mobile(f)), None) or (fones[0] if fones else None)
        tel1 = fmt(wa)
        tel2 = next((fmt(f) for f in fones if f != wa), None)
        cidade = (row.get('Business City') or row.get('Address 1 - City') or '').strip() or None
        estado = (row.get('Business State') or row.get('Address 1 - Region') or '').strip() or None
        notas = (row.get('Notes') or '').strip() or None
        if wa and wa in wa_exist: pulados += 1; continue
        if email and email.lower() in mail_exist: pulados += 1; continue
        emp = get_emp(empresa_nome) if empresa_nome else None
        db.add(Contato(nome=nome, empresa_id=emp.id if emp else None, email=email or None,
                       telefone1=tel1, telefone2=tel2, whatsapp=wa, cidade=cidade, estado=estado,
                       origem=origem, notas=notas, tipos=[], status='sem_info'))
        if wa: wa_exist.add(wa)
        if email: mail_exist.add(email.lower())
        novos += 1
db.commit()
print('Novos contatos importados:', novos)
print('Pulados (duplicados):', pulados)
print('Total de empresas:', len(emp_cache))
db.close()
