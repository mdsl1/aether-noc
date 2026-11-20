# AGENTS.md — A.E.T.H.E.R. (Spec-Driven Development)

Guia operacional para desenvolvimento do **A.E.T.H.E.R.** (painel de observabilidade pessoal em estética Dark Fantasy Pixel Art).

---

## 1. Mapa de Especificações (`spec/`)

Toda decisão técnica deve consultar primeiro a especificação correspondente:

1. [spec/01-product-vision.md](spec/01-product-vision.md) — Visão de produto, **Escopo Negativo** (travas do MVP v1.0) e **Definition of Done (DoD)**.
2. [spec/02-architecture.md](spec/02-architecture.md) — Arquitetura geral, stack (`NestJS` + `React/Vite` + `MongoDB`), SSE e deploy (`Render`/`Vercel`).
3. [spec/03-domain-model.md](spec/03-domain-model.md) — Schemas Mongoose (`Island`, `Totem`, `CheckLog`), tipos de totem e máquina de estados (`unknown`, `healthy`, `warning`, `critical`).
4. [spec/04-api-contract.md](spec/04-api-contract.md) — Contratos REST, autenticação JWT, payloads de `vm_heartbeat`, `force-check` e eventos SSE.
5. [spec/05-integrations.md](spec/05-integrations.md) — Checkers (`http_ping`, `n8n_workflow`, `supabase_keepalive`), alertas Telegram e scripts da VM.
6. [spec/06-frontend-ui.md](spec/06-frontend-ui.md) — Design tokens, direção de arte, algoritmo orbital, camadas (`z-index`), `<ArcaneChain/>`, `<Totem/>` e responsividade.

---

## 2. Estrutura & Tooling

- **Repositório único** dividido em:
  - `api/` — Back-end **NestJS** (TypeScript `strict: true`)
  - `web/` — Front-end **React + Vite** (TypeScript `strict: true`)
- **Gerenciador de pacotes:** `npm` em ambos os projetos (sem workspaces complexos ou Turborepo).
- **MongoDB local:** `docker-compose.yml` na raiz, com comandos documentados.

---

## 3. Regras Operacionais Obrigatórias

1. **Fonte de Verdade (`spec/`):** Toda rota, schema, DTO, token visual e regra de negócio deve obedecer estritamente às specs. Se houver lacuna ou contradição, **PARE e pergunte** antes de codar; nunca invente campos, endpoints ou dependências extras.
2. **Escopo Negativo & Execução Incremental:** Implemente apenas a tarefa/fase solicitada no prompt atual. Nunca antecipe fases futuras ou features fora do MVP v1.0 (ex.: Sign Up, troca de tema / "Amanhecer Distópico", gráficos de BI, editor drag-and-drop, multi-tenancy).
3. **Verificação por Entrega:** Antes de encerrar qualquer tarefa, execute dentro da pasta correspondente (`api/` ou `web/`):
   - Typecheck: `npx tsc --noEmit` (`strict: true`)
   - Lint: `npm run lint`
   - Testes relevantes: `npm test`
4. **Segurança & Git:**
   - Nunca leia, logue ou versione segredos reais (`.env`); mantenha `.env.example` sincronizado em `api/` e `web/`.
   - Use **Conventional Commits** apenas como sugestão e **não** execute `git commit` ou `git push` sem confirmação explícita do usuário.
5. **Padrão Visual Pixel Art:** Todo sprite `.webp` (`web/src/assets/sprites/`) e Pixel SVG (`pixelGlyphs.tsx`) deve usar `image-rendering: pixelated` / `shapeRendering="crispEdges"`. As `<ArcaneChain/>` são sempre SVG dinâmicos via código.
6. **Separação Atlas vs. Local:** A aplicação em execução (npm run start:dev) conecta ao MongoDB Atlas via MONGO_URI. Toda suíte de testes automatizados (Jest/Supertest), testes de stress ou scripts com múltiplos inserts devem conectar exclusivamente ao MongoDB local (docker-compose.yml) via MONGO_TEST_URI, com validação obrigatória garantindo que a URI seja localhost/127.0.0.1 antes de qualquer operação de limpeza ou escrita.
7. **Documentação de Comandos (`README.md`):** Sempre que um novo comando ou script for adicionado ao projeto (para qualquer finalidade — dev, build, seed, testes, Docker, utilitários), documente-o imediatamente no `README.md` da raiz com a descrição clara do que ele faz.

---

## 4. Roteiro de Fases

1. **Fase 1 — Assets & Setup:** Sprites `.webp`, `pixelGlyphs.tsx`, wireframe Figma e estrutura base `api/` + `web/`.
2. **Fase 2 — Fundação `api/`:** Conexão MongoDB, schemas (`Island`, `Totem`, `CheckLog`), seed inicial e autenticação JWT.
3. **Fase 3 — Checkers & Máquina de Estados:** Agendador de checks (`http_ping`, `n8n_workflow`, `supabase_keepalive`), endpoint `vm_heartbeat` e transições de status (`healthy`, `warning`, `critical`, `unknown`).
4. **Fase 4 — Tempo Real, Alertas & Testes:** Stream SSE, notificações Telegram e suíte de testes unitários/integração.
5. **Fase 5 — Arquipélago `web/`:** Cena orbital com `react-zoom-pan-pinch`, ilhas, `<Totem/>`, `<ArcaneChain/>` e nuvens animadas.
6. **Fase 6 — Drawer, HUD & Mobile:** HUD flutuante, `<TotemDrawer/>` (VM Heartbeat, Workflow LLM, HTTP Ping), Login (`401`/`429`) e Bottom Sheet mobile.
7. **Fase 7 — Deploy & DoD:** Deploy (`Render` + `Vercel`), validação ponta a ponta e checklist final do DoD em [spec/01-product-vision.md](spec/01-product-vision.md).
