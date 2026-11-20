# Roadmap

## Fase 1 — Governança do Agente & Assets Visuais

_Specs de referência: `01-visao-de-produto.md`, `06-especificacao-design-ui.md`_

1. **Gerar o `AGENTS.md` na raiz:** Consolidar o índice das specs, a divisão `api/` + `web/`, a proibição de features fora do MVP e a trava obrigatória de `MONGO_TEST_URI` local para testes.
    
2. **Criar os 4 sprites estáticos (`web/src/assets/sprites/`):** `island-core.webp`, `island-satellite-a.webp`, `island-satellite-b.webp` e `totem-base.webp` com fundo transparente.
    
3. **Criar o registro de runas (`web/src/components/totems/pixelGlyphs.tsx`):** 7 Pixel SVGs `16x16` (`server`, `n8n`, `globe`, `api`, `database`, `ai_agent`, `backup`) usando `shapeRendering="crispEdges"` e `fill="currentColor"`.
    
4. **Validação rápida de proporção (Figma ou preview HTML):** Conferir o encaixe do `totem-base.webp` + Pixel SVG sobre as ilhas e ajustar dimensões na spec se necessário.
    

**Critério de saída:** `AGENTS.md` revisado, 4 `.webp` nítidos na pasta correta e commit inicial (`chore: add agents guide and pixel art assets`).

## Fase 2 — Fundação do Back-end (`api/`)

_Specs de referência: `02-stack-e-infraestrutura.md`, `03-modelo-de-dominio.md`, `04-contrato-api-sse.md`_

1. **Bootstrap & Segurança:** Configurar `ConfigModule` com validação de `.env` (incluindo as 2 URLs/keys do Supabase), `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), `helmet`, CORS travado em `CORS_ORIGIN`, `app.set('trust proxy', 1)`, `ThrottlerModule` e Swagger (`/api/docs`).
    
2. **Camada de Domínio & Mongoose:** Criar enums (`TotemStatus`, `TotemType`, `IconKey`) e os schemas `islands`, `totem_states` e `totem_logs` com todos os índices obrigatórios (Compound Index `{ totemId: 1, timestamp: -1 }`, TTL Index de 14 dias e índice único parcial para `executionId` do n8n).
    
3. **Seed Idempotente (`seed.ts`):** Implementar `upsert` das 4 ilhas (12 totens, incluindo `portfolio-db` e `taco-db`) com scripts `npm run seed` (Atlas) e `npm run seed:local` (Docker).
    
4. **Healthcheck & Auth:** Implementar `GET /health` (checando `readyState === 1` do Mongo), `POST /api/auth/login` (bcrypt + JWT + rate limit `5/min`), `JwtAuthGuard` e `ApiKeyGuard` (`timingSafeEqual`).
    

**Critério de saída:** `npm run seed` populando o Atlas sem duplicar dados, Swagger acessível em `/api/docs`, `GET /health` respondendo `< 200ms` e login retornando JWT válido.

## Fase 3 — Motor de Telemetria & Endpoints REST (`api/`)

_Specs de referência: `03-modelo-de-dominio.md`, `04-contrato-api-sse.md`, `05-detalhes-integracoes.md`_

1. **Strategy Pattern dos 4 Checkers:**
    
    - `HttpPingChecker` (latência + status HTTP `200..299`).
        
    - `SupabaseHealthChecker` (resolução dinâmica via `ConfigService.get(config.supabaseKeyEnvRef)`).
        
    - `N8nWorkflowChecker` (API REST do n8n + parser recursivo de `tokenUsage` sem salvar payloads brutos).
        
    - `VmHeartbeatEvaluator` (avaliação de CPU/RAM/Disco + containers esperados).
        
2. **Máquina de Estados & Agendador:**
    
    - Aplicar anti-flapping (2 falhas consecutivas para HTTP/Supabase/n8n) e throttling de escrita em `totem_logs` para o heartbeat da VM.
        
    - Criar `SchedulerService` com `@Cron('* * * * *')` rodando os checkers elegíveis em `Promise.allSettled()` e o **Dead Man's Switch** (`> 12 min` sem heartbeat → `critical`).
        
    - Emitir evento interno `totem.updated` via `@nestjs/event-emitter`.
        
3. **Rotas de Consulta e Ação:**
    
    - `GET /api/islands` (topologia hidratada com `totem_states` + status agregado da ilha, sem vazar `config` interno).
        
    - `GET /api/totems/:totemId/logs` (paginado + `tokenSummary`).
        
    - `POST /api/totems/:totemId/check` (Force Check Pull com rate limit `10/min` e bloqueio `400` para `vm_heartbeat`).
        
    - `POST /api/telemetry/heartbeat` (protegido por `x-api-key`, `10/min`, retorna `202 Accepted`).
        

**Critério de saída:** Testar todas as rotas via Swagger/Postman (incluindo um heartbeat simulado e um Force Check real no Portfólio/Supabase/n8n) e confirmar gravação limpa no Atlas.

## Fase 4 — Tempo Real (SSE), Alertas Telegram & Testes (`api/`)

_Specs de referência: `03-modelo-de-dominio.md`, `04-contrato-api-sse.md`, `05-detalhes-integracoes.md`_

1. **Stream SSE (`GET /api/stream`):** Protegido por `JwtAuthGuard`, headers anti-buffer (`X-Accel-Buffering: no`), ouvindo `totem.updated` e enviando evento `ping` a cada 25 segundos.
    
2. **Alertas no Telegram (`AlertService`):** Ouvir `totem.updated` e aplicar a regra de disparo (`🚨 ALERTA CRÍTICO`), supressão por cooldown de 15 minutos e mensagem imediata de recuperação (`✅ RECUPERADO`) com horário em `America/Sao_Paulo`.
    
3. **Suíte Automatizada (`Jest + Supertest`):**
    
    - Configurar trava de segurança obrigatória validando `MONGO_TEST_URI` (`127.0.0.1` / `localhost`).
        
    - **Testes unitários:** máquina de estados (anti-flapping, Dead Man's Switch), agregação de status da ilha, cooldown do Telegram e parser recursivo de tokens do n8n.
        
    - **Testes de integração (contra o Docker local):** `/health`, `/auth/login` (401 e 429), `/telemetry/heartbeat` (API Key e validação DTO), `/islands` e `/totems/:id/logs`.
        

**Critério de saída:** `npm test` 100% verde rodando exclusivamente contra o MongoDB local, SSE entregando eventos em tempo real no terminal (`curl -N`) e teste real de mensagem chegando no seu Telegram. Back-end congelado para a v0.1.

## Fase 5 — Front-end: Autenticação & Arquipélago Vivo (`web/`)

_Specs de referência: `04-contrato-api-sse.md`, `06-especificacao-design-ui.md`_

1. **Base Visual & Infra do Front:** Instalar Tailwind CSS, Framer Motion, `@tanstack/react-query`, `react-zoom-pan-pinch`, `@microsoft/fetch-event-source` e `lucide-react`. Configurar Google Fonts (`Silkscreen`, `Inter`, `JetBrains Mono`), Design Tokens (CSS Variables) e a classe `.pixel-art`.
    
2. **Autenticação (`/login`):** Tela com céu crepuscular, card glassmorphism, tratamento de erros `401` e `429`, armazenamento do JWT e proteção de rotas.
    
3. **Camada de Dados & SSE:** Hook `useIslands()` (React Query) + hook `useAetherStream()` atualizando diretamente o cache via `queryClient.setQueryData` ao receber `totem.updated` e invalidando `['islands']` em reconexões.
    
4. **Cena Interativa:**
    
    - Canvas `2000x1400` dentro do `react-zoom-pan-pinch` com `centerOnInit`.
        
    - Algoritmo orbital elíptico posicionando a ilha `isCore` no centro e as satélites ao redor sem hardcode.
        
    - `<ArcaneChain/>` (SVG com catenária em Bézier reagindo ao status agregado da ilha).
        
    - `<Island/>` (flutuação dessincronizada respeitando `useReducedMotion`) e `<Totem/>` (2 camadas: `totem-base.webp` + `PixelGlyph` com brilho/pulso semântico), todos envolvidos em `React.memo`.
        

**Critério de saída:** Login funcionando contra a API local, arquipélago renderizando as 4 ilhas e 12 totens a 60fps, e mudança de cor da runa + corrente acontecendo ao vivo sem recarregar a página ao disparar um heartbeat/check.

## Fase 6 — Front-end: Drawer, HUD & Polimento Mobile (`web/`)

_Specs de referência: `06-especificacao-design-ui.md`_

1. **HUD Superior (`<TopHud/>`):** Logo, indicador de conexão SSE (`Tempo Real` / `Reconectando...` / `Offline`), resumo global clicável para focar alertas críticos, botão `Recentralizar` e `Sair`.
    
2. **Tooltips & Datas:** Hover tooltip nos totens com ícone do `Lucide React` (RNF-18) e utilitário nativo (`Intl.RelativeTimeFormat` / `Intl.DateTimeFormat`) convertendo UTC para horário local.
    
3. **Drawer Lateral (`<TotemDrawer/>`):**
    
    - Desktop (`w-[460px]` à direita) e Mobile (bottom sheet `90vh`).
        
    - Cabeçalho com botão **Force Check** (oculto/desabilitado com tooltip explicativo para `vm_heartbeat`).
        
    - Visões específicas: `vm_heartbeat` (barras CPU/RAM/Disco + lista de containers), `n8n_workflow` (status ativo/inativo + card de tokens LLM + histórico paginado) e `http_ping` / `supabase_health` (HTTP status + latência + histórico).
        
    - Estados obrigatórios: Loading (skeletons), Empty State e Error State com retry.
        

**Critério de saída:** Navegação completa validada em desktop (`1440px`) e mobile (`390px`), `tsc --noEmit` e `npm run build` passando sem warnings ou erros.

## Fase 7 — Deploy da v0.1 & Validação em Produção (DoD)

_Specs de referência: `01-visao-de-produto.md`, `02-stack-e-infraestrutura.md`, `05-detalhes-integracoes.md`_

1. **Deploy da API (Render):**
    
    - Criar Web Service apontando para o repositório com `Root Directory: api`, na mesma região do cluster Atlas (`us-east-1` ou `us-east-2`).
        
    - Build: `npm install && npm run build` | Start: `npm run start:prod`.
        
    - Preencher todas as env vars de produção (deixando `CORS_ORIGIN` temporário até subir a Vercel).
        
    - Validar `GET https://<sua-api>[.onrender.com/health](https://.onrender.com/health)` retornando `200 OK` com `database: "connected"`.
        
2. **Keep-Alive Externo:** Configurar Cron-job.org ou UptimeRobot fazendo `GET /health` a cada 5 minutos para impedir hibernação do Free Tier.
    
3. **Deploy do Front-end (Vercel):**
    
    - Importar repositório com `Root Directory: web` (preset Vite) e definir `VITE_API_URL=https://<sua-api>.onrender.com`.
        
    - Voltar no Render e travar `CORS_ORIGIN` com a URL final da Vercel.
        
4. **Agente da VM Ubuntu (Heartbeat):**
    
    - Instalar o script Bash (`aether-heartbeat.sh`) na sua VM Ubuntu coletando CPU, RAM, Disco e `docker ps`, enviando para `POST /api/telemetry/heartbeat` com `x-api-key`.
        
    - Agendar no `crontab` a cada 3 minutos (`*/3 * * * *`) e confirmar o totem `core-vm` ficando verde no painel.
        
5. **Teste de Fogo (DoD Final):**
    
    - Simular uma falha controlada (ex: pausar o cron do heartbeat ou testar um endpoint inválido), confirmar a runa + corrente ficarem carmesim em tempo real via SSE e validar o recebimento do alerta `🚨 ALERTA CRÍTICO` no Telegram.
        
    - Restaurar o serviço e confirmar a transição para esmeralda + mensagem `✅ RECUPERADO` no Telegram.
        
    - Criar a tag `v0.1.0` no Git.