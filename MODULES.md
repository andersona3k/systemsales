# Módulos do SGC — inventário e contrato

> Companion de [ARCHITECTURE.md](ARCHITECTURE.md). Lista **todos os módulos atuais**
> classificados (núcleo / negócio / pessoal / cliente), com rotas, tabelas e
> dependências — tudo extraído do código real em 2026-07-28.

## 1. Contrato de módulo (o padrão a seguir)

Todo módulo migrado (ou novo) segue esta estrutura autossuficiente:

```
modules/<id>/
  backend/
    models.py         # tabelas (SQLAlchemy)
    schemas.py        # validação (Pydantic)
    router.py         # APIRouter(prefix="/api/<id>")
    migrations/       # Alembic — cria/remove as tabelas do módulo
  frontend/
    <id>.js           # registra menu + páginas + lógica
    <id>.css          # (opcional)
  module.json         # manifesto
```

Exemplo de `module.json`:
```json
{
  "id": "prospeccao",
  "nome": "Prospecção",
  "grupo_menu": "PROSPECÇÃO",
  "categoria": "negocio",
  "depende_de": ["cadastro"],
  "tabelas": ["prosp_empresas","prosp_pessoas","prosp_listas",
              "prosp_checklist_templates","prosp_cards","prosp_atividades",
              "prosp_crm_registros"],
  "paginas": [
    {"id":"prosp-dash","label":"dashboard","permissao":"prospeccao.dashboard.ver"},
    {"id":"prospeccao-empresas","label":"empresas","permissao":"prospeccao.empresas.ver"},
    {"id":"prospeccao-kanban","label":"kanban","permissao":"prospeccao.kanban.ver"},
    {"id":"crm-registros","label":"crm","permissao":"prospeccao.crm.ver"}
  ]
}
```

## 2. Inventário atual

Legenda de status frontend: **mono** = ainda dentro do `app.js` (monólito).

### NÚCLEO (sempre presente)

| Módulo | Grupo menu | Rota API | Tabelas | Depende de | FE |
|---|---|---|---|---|---|
| Autenticação | (login) | `/api/auth` | — (usa `usuarios`) | — | mono |
| Usuários & Permissões | ADMIN › usuarios | `/api/usuarios` | `usuarios` | — | mono |
| Configurações | ADMIN › configurações | `/api/configuracoes` | `configuracoes` | — | mono |
| Catálogos & Campos | (infra) | `/api/categorias`, `/api/campos-customizados` | `categorias`, `campos_customizados` | — | mono |
| Exportação | (infra) | `/api/perfis-exportacao` | `perfis_exportacao` | — | mono |
| Home / Dashboard | CARDBASE › dashboard | `/api/dashboard`, `/api/resumo` | — | cadastro | mono |

### NEGÓCIO — a prateleira reutilizável

| Módulo | Grupo menu | Rota API | Tabelas | Depende de | FE |
|---|---|---|---|---|---|
| **Cadastro / CRM base** | CARDBASE (cadastro, empresas, contatos) | `/api/contatos`, `/api/empresas`, `/api/ocr` | `contatos`, `empresas`, `campos_customizados`, `categorias` | núcleo | mono |
| **Financeiro** | FINANCEIRO (vendas, comissão, controle financeiro, análise) | `/api/fin` | `vendas`, `venda_itens`, `fin_produtos`, `fin_config`, `fin_lancamentos`, `fin_parcelas` | cadastro (cliente) | mono |
| **Operações** | OPERAÇÕES (calculadora, bom, precificação, produtos, links) | `/api/operacoes` | `op_precificacao_eventos`, `op_precificacao_produtos` | — | mono (parte placeholder) |
| **Prospecção** | PROSPECÇÃO (dashboard, empresas, contatos, listas, kanban, crm, mensagem) | `/api/prospeccao` | `prosp_empresas`, `prosp_pessoas`, `prosp_listas`, `prosp_checklist_templates`, `prosp_cards`, `prosp_atividades`, `prosp_crm_registros` | cadastro | mono |

### PESSOAL (deploy do Anderson — não entrega a clientes)

| Módulo | Grupo menu | Rota API | Tabelas | Obs |
|---|---|---|---|---|
| Cofre / Acessos | ANDERSON › acessos | `/api/cofre` | `cofre_meta`, `cofre_acessos` | Zero-knowledge (cripto no cliente). |
| Meu QR Code | ANDERSON › meu qr code | via `/api/configuracoes` | — | Usa `qrcode_service`. |
| Fotos / Galerias | ANDERSON › fotos | `/api/galerias` | `galerias` | |
| Links | ANDERSON › links | `/api/links` | `links` | |
| Compras (cartão de crédito) | FINANCEIRO › compras | `/api/fin` | `fin_cc_lancamentos`, `fin_cc_parcelas`, `fin_cc_ajustes` | **Vive dentro do Financeiro mas é pessoal** → candidato a separar. |

### CLIENTE-ESPECÍFICO / PROTÓTIPO

| Módulo | Grupo menu | Rota API | Tabelas | Obs |
|---|---|---|---|---|
| Social Media | SOCIAL MEDIA (calendário, contas, lembretes) | `/api/publicacoes`, `/api/redes` | `publicacoes`, `redes_sociais` | Contas específicas (gesser, lugar ao sul, instagram 2, whatsapp). |
| Catálogo de Cervejas | ANDERSON › catálogo de cervejas | `/api/cervejas` | `cervejas` | Conteúdo de Instagram de cliente específico. |

## 3. Dependências entre módulos

- **Prospecção → Cadastro** (usa empresas/contatos como base de leads).
- **Financeiro → Cadastro** (o "cliente" da venda; hoje é texto livre — falta
  vincular formalmente a Empresa/Contato → ver Lacunas).
- **Todos → Núcleo** (auth, usuários/permissões, configurações).
- **Compras** depende da infra do **Financeiro** (mesmo `/api/fin`).

> Regra prática de entrega: "quero Prospecção" ⇒ arrasta **Cadastro** junto.

## 4. Lacunas — módulos que faltam para uma operação comercial

O sistema nasceu para operação comercial e ainda faltam peças. Candidatos
(a confirmar com o Anderson — não construir sem alinhar):

- **Propostas / Orçamentos** formais (gerar PDF). Hoje "Cotação Goevo" é só um
  tipo de registro no CRM.
- **Contratos** (ciclo de vida, assinatura, vigência).
- **Pedidos / Faturamento / NF-e** — hoje a NF é anotada manualmente na Venda.
- **Estoque / Inventário** genérico (o controle de barril do BarraChopp é um
  sistema separado, de outro cliente).
- **Vínculo Cliente ↔ Lead/Empresa** — unificar o "cliente" do Financeiro com a
  Empresa do Cadastro/Prospecção (pendência já conhecida).
- **Lembretes unificados** — hoje vivem dentro de Social Media; deveriam ser
  transversais.
- **Relatórios / BI consolidado** entre módulos (visão única).
- **Integrações** — WhatsApp API, e-mail, importação Sales Navigator/planilhas.

## 5. Próximo passo sugerido

Migrar o **Prospecção** para o formato de módulo (pasta `modules/prospeccao/` +
`module.json` + quebrar seu JS do `app.js`), como **piloto** da prateleira. É o
módulo mais forte e o que mais tende a ser reaproveitado.
