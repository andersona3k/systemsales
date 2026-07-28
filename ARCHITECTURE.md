# Arquitetura — SGC (Sistema de Gestão Comercial)

> Documento-planta. Define **como o sistema é organizado em módulos**, o que é
> pessoal × negócio × cliente, e como uma entrega é montada a partir da
> "prateleira". Inventário detalhado em [MODULES.md](MODULES.md).

## 1. Visão: monólito modular + prateleira

O SGC **não** é um sistema único fechado, nem um conjunto de microserviços.
É um **monólito modular**:

- Um **NÚCLEO** (autenticação, usuários, permissões, configurações, menu/shell)
  que está sempre presente.
- Uma **PRATELEIRA de módulos** (Prospecção, Financeiro, Operações, CRM…) —
  peças reutilizáveis que resolvem problemas de uma operação comercial.
- Cada **entrega/cliente** é uma **receita**: liga os módulos que fazem sentido,
  conecta-os e ajusta telas/regras de negócio.

Princípio de trabalho (decisão de 2026-07-28): **o sistema completo sobe junto**;
a modularização (separar cada módulo em pasta própria) é feita **sob demanda**,
conforme um projeto precisar reaproveitar aquele módulo. Nada de quebrar tudo de
uma vez — habilita/desabilita e evolui em cima do que já existe.

## 2. As 4 categorias de módulo

Todo módulo se encaixa em uma destas gavetas (ver classificação em MODULES.md):

| Categoria | O que é | Vai para clientes? |
|---|---|---|
| **NÚCLEO** | Base da plataforma (auth, usuários, config, menu). | Sempre. |
| **NEGÓCIO** (prateleira) | Ferramentas comerciais reutilizáveis. Viram produto. | Sim, sob demanda. |
| **PESSOAL** | Uso do Anderson (cofre, QR, fotos, compras). | Só no deploy pessoal. |
| **CLIENTE-ESPECÍFICO / PROTÓTIPO** | Feito para um cliente/conta específica. | Só naquele cliente. |

## 3. Habilitar/desabilitar: DOIS níveis diferentes

É importante não confundir. São dois mecanismos:

| Nível | Pergunta | Como se controla |
|---|---|---|
| **Módulo por cliente/deploy** | "esta instalação tem Prospecção?" | **Config de habilitação** (feature flag) — lista de módulos ligados na entrega. *(a construir)* |
| **Função por usuário** | "este vendedor pode ver Comissão?" | **Permissões** — JÁ EXISTE (JSONB Ver/Add/Rem por módulo, tela ADMIN › Usuários, `aplicarPermissoes` no app.js). |

**Regra do menu (alvo):** um item aparece quando `módulo habilitado` **E**
`usuário tem permissão`. "Tudo por trás, mas o front mostra só o que faz sentido
ou o usuário pode" = exatamente essa interseção. Hoje o menu tem os grupos
chumbados no builder; a evolução é gerá-lo a partir do **registro de módulos**.

## 4. Fluxo de entrega (template → cliente)

- **Repositório-template:** `github.com/andersona3k/systemsales`, branch `main` =
  plataforma + prateleira completa.
- **Cliente novo:** criar a partir do template ("Use this template") **ou** um
  branch, com um `client.config` declarando os módulos ligados + customizações.
- **Melhoria num módulo** no `main` → puxar (merge/cherry-pick) para os clientes
  que quiserem.
- **Necessidade nova** → constrói-se **em cima do que existe**; se for algo
  genérico, vira **módulo novo na prateleira** (reaproveitável).

## 5. Contrato de módulo (resumo)

Para virar peça de prateleira, um módulo deve ser uma **pasta autossuficiente**
com sempre as mesmas partes (detalhe e exemplo em MODULES.md):

```
modules/<id>/
  backend/   models.py · schemas.py · router.py (prefixo /api/<id>) · migrations/
  frontend/  <id>.js (registra menu + páginas) · <id>.css
  module.json  ← manifesto: id, grupo de menu, páginas, permissões, dependências, tabelas
```

Hoje **o backend já é praticamente modular** (um trio models/schemas/router por
assunto). O **frontend é um monólito** (`frontend/js/app.js`, ~8.000 linhas) —
esse é o principal trabalho de modularização, feito **um módulo por vez**.

## 6. Estado atual

| Aspecto | Situação |
|---|---|
| Backend | Modular por arquivo (models/routers/schemas). Registro manual no `main.py`. Tabelas via `create_all` (não por módulo ainda). |
| Frontend | **Monólito** em `app.js`, blocos identificados por comentários `/* ===== ... ===== */`. |
| Permissões | Por módulo (Ver/Add/Rem), funcionando. Falta granularidade por função/página. |
| Habilitação de módulo | Não existe ainda (tudo sempre ligado). |
| Migrations | Alembic instalado, mas o schema nasce por `create_all`. |

## 7. Roadmap (progressivo, sem parar a operação)

1. **Documentar** arquitetura + inventário + contrato ← *este passo*.
2. **Modularizar o frontend** um módulo por vez (quebrar `app.js`). Começar pelo
   **Prospecção** (produto mais forte/reutilizável).
3. **Registro central de módulos + config de habilitação** (feature flags): menu
   e `main.py` passam a ler a lista de módulos ligados.
4. **Migrations por módulo** (Alembic): instalar/desinstalar cria/remove só as
   tabelas daquele módulo.
5. **Permissão por função/página** (evoluir o que já existe).
6. **Template + fluxo de cliente** documentado (a "receita" de entrega).
