# Visão de produto


## **Identidade & Problema (O "Porquê")**

### Como definir o produto em uma frase?

Um painel de monitoramento estilizado em formato de arquipélago voador, onde cada ilha representa um projeto pessoal que exibe a saúde dos seus elementos (servidores, APIs, páginas web, workflows)
### Qual dor ele resolve?

Idealizei esse projeto visando principalmente centralizar o monitoramento de todos os meus projetos, para não precisar ter de ficar abrindo diversas abas (painel do n8n, Supabase, painel da Oracle Cloud ou acessar a VM via ssh)
### Por que fazer ele dessa forma?

Para ficar intuitivo: Dessa forma, fica fácil de visualizar quais serviços (Totens) de um projeto (ilha) estão funcionando (cores verdes), instáveis (cores amarelas/ alaranjadas) ou fora do ar (cores vermelhas), além de servir como uma excelente vitrine de engenharia full-stack pro meu portfólio.


## Público-Alvo & Perfil de Uso (O “Quem”)

### Quem vai usar esse sistema?

Para a primeira versão desse projeto será apenas eu (administrador único), inclusive o usuário e senha de login ficará no .env da API. Mas futuramente, o primeiro incremento da v2 será um modo público (readonly) para visitantes do meu portfólio verem o arquipélago sem acessar os logs.
### Qual vai ser a jornada do usuário?

1. Fazer o login no painel
2. Logo de cara já visualizar se alguma ilha ou totem estiver fora ou em estado de alerta
3. Clicar em um totem específico pra visualizar métricas recentes, logs de execução do n8n ou consumo de tokens de LLMs
4. Receber alertas proativos no Telegram caso algo caia enquanto o painel estiver fechado


## Escopo inicial do projeto (O “O quê” do MVP)

Cada ilha representa um projeto ou domínio operacional, e cada totem possui um **tipo de checker** (`vm_heartbeat`, `http_ping`, `n8n_workflow`, `supabase_health`) que define exatamente o que o back-end coleta e o que o Drawer exibe ao clicar:

#### Ilha 1 — Core (`core` — _Ilha Central_)

Sempre será a ilha central do projeto. Todas as demais ilhas conectam-se visualmente a ela via pontes SVG.
- **Totem: VM Principal (`core-vm`)**
    - **Tipo:** `vm_heartbeat` (Push via script Bash + Crontab a cada 2–5 min)
    - **O que retorna:**
        - `cpuLoad1m` (carga média da CPU no último minuto)
        - `ramUsedMb`, `ramTotalMb` e `ramUsedPercent` (%)
        - `diskPercent` (% de uso da partição raiz `/`)
        - `containers`: lista de containers Docker monitorados com `{ name, status }` (ex: `running`, `exited`)
        - `lastCheckAt` (timestamp UTC do último heartbeat recebido)
- **Totem: Serviço n8n (`core-n8n`)**
    - **Tipo:** `http_ping` (Pull em `GET {N8N_BASE_URL}/healthz`)
    - **O que retorna:**
        - `statusCode` (código HTTP da resposta do proxy reverso + n8n)
        - `latencyMs` (tempo de resposta em milissegundos)
        - `isReachable` (`true`/`false`)
        - `errorMessage` (resumo da falha, caso timeout ou status `>= 400`)
        - `lastCheckAt` (timestamp UTC da verificação)
#### Ilha 2 — Portfólio (`portfolio`)

- **Totem: Front-end (`portfolio-web`)**
    - **Tipo:** `http_ping` (Pull na URL do GitHub Pages)
    - **O que retorna:** `statusCode`, `latencyMs`, `isReachable`, `errorMessage` (se houver) e `lastCheckAt`.
- **Totem: API Back-end (`portfolio-api`)**
    - **Tipo:** `http_ping` (Pull na rota `/health` da API no Render ou futura VM)
    - **O que retorna:** `statusCode`, `latencyMs`, `isReachable`, `errorMessage` (se houver) e `lastCheckAt`.
- **Totem: Notificação de Contato (`portfolio-n8n-contact`)**
    - **Tipo:** `n8n_workflow` (sem LLM — Pull na API REST do n8n por `workflowId`)
    - **O que retorna:**
        - `isActive` (`true`/`false` — indica se o workflow está ativado no n8n)
        - `executions`: histórico recente contendo `{ executionId, status, startedAt, durationMs, errorMessage? }`
        - `tokenUsage`: `null`
- **Totem: Banco de Dados (`portfolio-db`)**
    - **Tipo:** `supabase_health` (Pull em `GET {SUPABASE_URL}/rest/v1/` com `apikey`)
    - **O que retorna:** `statusCode`, `latencyMs`, `isReachable` (confirma que o banco está ativo e não pausado), `errorMessage` (se houver) e `lastCheckAt`.
### Ilha 3 — T.A.C.O. (`taco`)

- **Totem: Orchestrator (`taco-orchestrator`)**
    - **Tipo:** `n8n_workflow` (com LLM — Pull na API REST do n8n por `workflowId`)
    - **O que retorna:**
        - `isActive` (`true`/`false`)
        - `executions`: histórico recente contendo `{ executionId, status, startedAt, durationMs, errorMessage? }`
        - `tokenUsage` (por execução e total consolidado no período): `{ promptTokens, completionTokens, totalTokens }`
- **Totem: Gestor de Finanças (`taco-finance`)**
    - **Tipo:** `n8n_workflow` (com LLM)
    - **O que retorna:** Mesmo contrato do Orchestrator (`isActive`, histórico de `executions` e `tokenUsage` com `promptTokens`, `completionTokens` e `totalTokens`).
- **Totem: Conselho (`taco-council`)**
    - **Tipo:** `n8n_workflow` (com LLM)
    - **O que retorna:** Mesmo contrato do Orchestrator (`isActive`, histórico de `executions` e `tokenUsage` com `promptTokens`, `completionTokens` e `totalTokens`).
- **Totem: Banco de Dados (`n8n-db`)**
    - **Tipo:** `supabase_health` (Pull em `GET {SUPABASE_URL}/rest/v1/` com `apikey`)
    - **O que retorna:** `statusCode`, `latencyMs`, `isReachable` (confirma que o banco está ativo e não pausado), `errorMessage` (se houver) e `lastCheckAt`.
- **Extensibilidade Interna:** Novos agentes do ecossistema T.A.C.O. devem ser incorporados apenas cadastrando novos totens do tipo `n8n_workflow` dentro desta ilha.
### Ilha 4 — Monitoramento & Backup (`ops-backup`)

- **Totem: Keep-Alive Supabase (`ops-supabase-keepalive`)**
    - **Tipo:** `n8n_workflow` (sem LLM — frequência de check reduzida, ex: 30–60 min)
    - **O que retorna:** `isActive`, histórico de `executions` (`{ executionId, status, startedAt, durationMs, errorMessage? }`) e `tokenUsage: null`.
- **Totem: Backup n8n no GitHub (`ops-n8n-backup`)**
    - **Tipo:** `n8n_workflow` (sem LLM — frequência de check reduzida, ex: 30–60 min)
    - **O que retorna:** `isActive`, histórico de `executions` (`{ executionId, status, startedAt, durationMs, errorMessage? }`) e `tokenUsage: null`.
### Ilha N — Futuros Projetos (Ex: _Agend.AI_)

A arquitetura orientada a dados (_Config-Driven_) garante que novas ilhas e totens sejam adicionados exclusivamente via inserção na coleção `islands` (ou arquivo de seed), utilizando qualquer um dos 4 tipos de checkers existentes, sem exigir alterações no código do front-end ou criação de novas rotas no back-end.


## Escopo Negativo (O "O Que NÃO Fazer”)

Essas são coisas que NÃO serão feitas, nem farão parte desse projeto:

#### 1. Autenticação & Gestão de Usuários

- **Sem sistema multi-usuário ou multi-tenant:** Não criar tela de cadastro (_Sign Up_), tabela/collection de `users` no MongoDB, recuperação de senha (_Forgot Password_), confirmação por e-mail ou login social (OAuth Google/GitHub).
- **Sem RBAC (Permissões/Cargos):** Existe apenas um usuário administrador validado via hash no `.env`. Não implementar níveis de acesso (`admin`, `viewer`, `editor`) no MVP v.01.
#### 2. Visual, Gamificação & Front-end

- **Sem engines de jogos:** Proibido instalar `Phaser`, `PixiJS`, `Three.js`, `Babylon.js` ou montar loops complexos de `<canvas>` 2D/3D. Toda a cena deve usar HTML, CSS, SVG, Tailwind e `Framer Motion`.
- **Sem movimentação livre ou física:** Não criar personagens/avatares andando, algoritmos de _pathfinding_ (A*), detecção de colisão ou física de partículas pesada. As ilhas flutuam no lugar e os totens são elementos fixos e clicáveis.
- **Sem editor visual na UI (no MVP):** Não construir interface _drag-and-drop_ para criar, reposicionar ou editar ilhas e totens pela tela. A topologia é orientada a configuração/seed ou API.
- **Sem "perfumaria" prematura:** Não adicionar efeitos sonoros/música de fundo, ciclo dinâmico de dia/noite, temas extras ou gráficos analíticos complexos (ex: dashboards de BI ou exportação de relatórios em PDF/CSV) no MVP.
- **Sem hardcode de ilhas no Front-end:** O React não deve ter componentes fixos como `<TacoIsland/>` ou `<PortfolioIsland/>`. Deve existir apenas um componente genérico `<Island/>` que renderiza dinamicamente o que vier da API.
#### 3. Limites de Ação (Somente Observabilidade)

- **Não é uma ferramenta de controle remoto da VM:** O A.E.T.H.E.R. **não** deve abrir conexões SSH, executar comandos na VM, nem ter botões para reiniciar containers Docker (`docker restart`) ou desligar serviços.
- **Não é um editor/orquestrador do n8n:** O sistema apenas **lê** o status e o histórico de execuções via API REST. Ele não edita nós, não ativa/desativa workflows e não dispara fluxos de negócio (a única ação manual permitida é um _Force Check_ para refazer a leitura de saúde).
- **Não altera bancos monitorados:** No monitoramento do Supabase, o sistema faz apenas requisições de leitura/healthcheck, nunca inserindo, alterando ou apagando dados de negócio dos outros projetos.
#### 4. Arquitetura, Infraestrutura & Limites do Free Tier

- **Sem WebSockets (`Socket.io` / `ws`):** A comunicação em tempo real deve ser estritamente via **SSE (Server-Sent Events)**, conforme definido na arquitetura.
- **Sem infraestrutura paga ou brokers extras:** Não introduzir Redis, RabbitMQ, Kafka, BullMQ ou serviços externos pagos para filas/cache. Tudo deve rodar em memória no NestJS ou persistido no MongoDB Atlas.
- **Proibido salvar payloads brutos gigantes no MongoDB:** Ao consultar `includeData=true` na API do n8n, o back-end deve extrair apenas os metadados úteis (status, duração, mensagem de erro resumida e contagem de tokens) e **descartar o JSON completo de prompts/respostas/binários**, preservando o limite de 512 MB do plano M0.
- **Sem logs eternos:** Nenhuma collection de histórico (`totem_logs`) pode ser criada sem um **TTL Index** configurado.
- **Não hospedar o monitor dentro da VM monitorada:** Não criar scripts ou `docker-compose` que acoplam o back-end do A.E.T.H.E.R. à mesma VM do _Core_.
#### 5. Qualidade & Disciplina de SDD

- **Não inventar rotas ou campos fora da spec:** O agente não deve adicionar endpoints, propriedades no banco ou bibliotecas npm que não estejam aprovados nas specs sem perguntar antes.
- **O modo público NÃO entra na v.01:** O modo público (read-only) planejado para a v.02 está explicitamente fora do escopo da v1; nenhuma rota pública além de `/health` e `/auth/login` deve ser criada agora.
- **Não desabilitar segurança para "facilitar":** Proibido remover `ThrottlerGuard`, validação de `class-validator`, `helmet`, `JWT` ou `x-api-key` mesmo em ambiente de testes manuais.


## Requisitos Não-Funcionais & Restrições de Negócio

#### 1. Resiliência & Disponibilidade

- **RNF-01 — Monitoramento Fora de Banda (Out-of-Band):** A aplicação (Vercel + Render + MongoDB Atlas) deve operar de forma 100% independente da VM monitorada (_Core_), garantindo que alertas continuem sendo disparados mesmo em caso de queda total ou travamento da VM.
- **RNF-02 — Isolamento de Falhas nas Checagens:** Os checks agendados no `@Cron` devem ser executados em paralelo usando `Promise.allSettled()`. A falha ou lentidão de um totem/API externa **nunca** pode travar ou cancelar a verificação dos demais totens do ciclo.
- **RNF-03 — Reconexão Automática do SSE:** Caso a conexão SSE caia (perda de rede do usuário ou reinício do container no Render), o front-end (`@microsoft/fetch-event-source`) deve reconectar automaticamente com _backoff_ exponencial e sincronizar o estado mais recente das ilhas sem exigir recarregamento manual (`F5`).
- **RNF-04 — Prevenção de Cold Start:** O back-end deve expor uma rota pública leve (`GET /health`) que responda em `< 200ms` (validando também a conexão com o MongoDB) para ser consumida pelo Keep-Alive externo a cada 5 minutos.
#### 2. Performance & Restrições de Free Tier (Custo Zero)

- **RNF-05 — Timeouts Estritos em Integrações:** Todas as chamadas HTTP externas feitas pelo back-end devem possuir timeout obrigatório (`8000ms` para API do n8n; `10000ms` para healthchecks HTTP/Supabase) para impedir vazamento de conexões e acúmulo de memória no plano gratuito do Render (512 MB RAM).
- **RNF-06 — Descarte de Payloads Brutos (Gestão de Memória e Disco):** Ao consumir `includeData=true` da API do n8n, o back-end deve extrair apenas status, duração, mensagem de erro resumida e `tokenUsage`, descartando imediatamente o JSON completo da memória e **nunca** persistindo prompts/respostas inteiras no MongoDB.
- **RNF-07 — Teto de Armazenamento no MongoDB Atlas (M0 - 512 MB):** A coleção `totem_logs` deve possuir obrigatoriamente um **TTL Index** configurado (ex: 7 a 15 dias) e um **Compound Index** (`{ totemId: 1, timestamp: -1 }`), garantindo que o banco nunca atinja o limite de espaço e que a abertura do Drawer de histórico responda em `< 300ms`.
- **RNF-08 — Fluidez Visual no Front-end:** As animações do arquipélago (flutuação das ilhas, nuvens, pulso dos totens e zoom/pan) devem rodar a 60fps utilizando exclusivamente propriedades aceleradas por GPU (`transform`, `opacity`), evitando _re-renders_ desnecessários no React quando apenas um único totem atualizar via SSE.
#### 3. Segurança & Proteção de Dados

- **RNF-09 — Autenticação Stateless & Separação de Chaves:**
    - O painel administrativo deve usar autenticação **JWT** (expiração configurável, ex: `7d`), validando a senha mestre contra um hash `bcrypt` armazenado no `.env`.
    - Endpoints de ingestão (`POST /api/telemetry/heartbeat`) devem usar uma chave estática independente via header (`x-api-key`), desacoplada do JWT do painel.
- **RNF-10 — Rate Limiting (Token Bucket) & Trust Proxy:** O back-end deve configurar `app.set('trust proxy', 1)` e aplicar `@nestjs/throttler` em todas as rotas, com limites mais restritos na rota de login (ex: 5 tentativas/minuto para bloquear força bruta) e na rota de telemetria (10 req/minuto).
- **RNF-11 — CORS Restrito e Headers Seguros:** O `helmet` deve estar ativo em produção e o CORS deve liberar **exclusivamente** a origem do front-end na Vercel (e `localhost` em dev), nunca utilizando wildcard (`*`) em produção.
- **RNF-12 — Validação Rigorosa de Entrada:** O `ValidationPipe` global do NestJS deve operar com `whitelist: true` e `forbidNonWhitelisted: true`, rejeitando qualquer campo não especificado nos DTOs.
- **RNF-13 — Zero Vazamento de Segredos:** Nenhuma credencial (`N8N_API_KEY`, `TELEGRAM_BOT_TOKEN`, `SUPABASE_ANON_KEY`, `MONGO_URI`, `INGEST_API_KEY`) pode ser exposta em respostas da API, stack traces de erro ou no bundle do front-end. A aplicação deve falhar ao iniciar (_fail-fast_) se qualquer variável obrigatória do `.env` estiver ausente.
#### 4. Escalabilidade & Manutenibilidade (Foco em SDD)

- **RNF-14 — Topologia Orientada a Dados (Config-Driven):** Adicionar uma nova ilha (ex: _Agend.AI_) ou um novo totem não deve exigir alteração de código no front-end nem criação de novos endpoints no back-end — apenas o cadastro da nova configuração na coleção `islands` (ou arquivo de seed).
- **RNF-15 — Extensibilidade de Checkers (Strategy Pattern):** A lógica de coleta no back-end deve ser desacoplada por tipo de totem (`http_ping`, `n8n_workflow`, `supabase_health`, `vm_heartbeat`). Adicionar um novo tipo de monitor no futuro deve exigir apenas a criação de uma nova classe _checker_, sem modificar o agendador principal.
- **RNF-16 — Padrão de Código & Testabilidade:** O projeto deve utilizar TypeScript em modo estrito (`strict: true`), ESLint + Prettier, Conventional Commits e manter cobertura de testes unitários (`Jest`) obrigatória para as regras de negócio críticas (parser recursivo de tokens do n8n, máquina de estados dos totens e lógica de cooldown do Telegram). O código sempre deve ser pensado para ser o mais simples e intuitivo possível - código simples é fácil de escalar.
#### 5. Usabilidade, Responsividade & Fuso Horário

- **RNF-17 — Responsividade Mobile:** O arquipélago deve ser plenamente navegável em smartphones (com gestos de pinça/arraste via `react-zoom-pan-pinch`), e o Drawer de histórico deve se adaptar para tela cheia ou _bottom sheet_ no mobile — pensando no uso rápido logo após receber um alerta no Telegram.
- **RNF-18 — Legibilidade Imediata (Acessibilidade Visual):** Os estados dos totens (`healthy`, `warning`, `critical`, `unknown`) devem ser diferenciados não apenas por cor, mas também por ícone, brilho/animação e rótulo textual no tooltip/drawer.
- **RNF-19 — Padronização de Datas e Fusos Horários:** Todo timestamp persistido no MongoDB e trafegado nas APIs/SSE deve estar em **UTC (ISO 8601)**. A conversão para o fuso local (`America/Sao_Paulo` ou fuso do navegador) ocorre exclusivamente na camada de apresentação do front-end e na formatação das mensagens do Telegram.
#### 6. Auto-Observabilidade (Logs do Próprio A.E.T.H.E.R.)

- **RNF-20 — Logs Estruturados no Back-end:** O NestJS deve registrar logs claros (usando o `Logger` nativo) para eventos críticos internos (falha ao conectar no MongoDB, erro ao disparar mensagem no Telegram, falha de parsing de payload do n8n ou timeout de heartbeat), facilitando o diagnóstico direto pelo painel de logs do Render.


## Definition of Done (DoD) — MVP v1.0

O MVP do **A.E.T.H.E.R.** só será considerado concluído quando **todos** os critérios verificáveis abaixo forem satisfeitos e validados em ambiente de produção:
#### 1. Interface, Arquipélago & Tempo Real (Front-end)

- [ ] **Renderização Inicial:** Todas as ilhas iniciais (_Core_, _Portfólio_, _T.A.C.O._ e _Monitoramento & Backup_) são renderizadas dinamicamente a partir da API e conectadas visualmente à ilha _Core_ via SVG.
- [ ] **Atualização via SSE:** Mudanças de estado dos totens (`healthy`, `warning`, `critical`, `unknown`) refletem na tela em tempo real sem necessidade de recarregar a página (`F5`), com reconexão automática em caso de queda de rede.
- [ ] **Drawer de Detalhes Completo:** Clicar em qualquer totem abre o Drawer lateral exibindo os dados correspondentes ao seu tipo (com datas convertidas para o fuso local):
    - [ ] **VM (`vm_heartbeat`):** CPU load, uso de RAM, uso de Disco e lista de status dos containers Docker.
    - [ ] **Workflows com LLM (`n8n_workflow`):** Histórico de execuções (status, duração, erro resumido) + soma consolidada de tokens (`prompt`, `completion`, `total`).
    - [ ] **Workflows sem LLM (`n8n_workflow`):** Histórico de execuções com status, duração e horário.
    - [ ] **Sites e APIs (`http_ping`):** Histórico de disponibilidade com código HTTP e latência em `ms`.
    - [ ] **Bancos (`supabase_health`):** Status de conectividade e horário da última verificação bem-sucedida.
- [ ] **Ação Manual (_Force Check_):** Botão dentro do Drawer dispara uma nova checagem sob demanda no back-end e atualiza o estado/histórico do totem imediatamente.
- [ ] **Responsividade & Navegação:** Zoom e arraste (_pan/pinch_) funcionando de forma fluida (60fps) no desktop e no mobile, com o Drawer legível em telas pequenas.
#### 2. Telemetria, Integrações & Ciclo de Alertas (Back-end)

- [ ] **Parser Recursivo de Tokens:** O back-end extrai e soma corretamente os tokens de execuções do n8n (inclusive em _AI Agents_ com múltiplas chamadas por execução), descartando o payload bruto antes de salvar no banco.
- [ ] **Heartbeat & _Dead Man's Switch_:** O script Bash via `crontab` envia métricas da VM periodicamente. Ao interromper o script propositalmente em teste, o totem `core-vm` transiciona para `critical` após o tempo limite configurado.
- [ ] **Alertas no Telegram:** Qualquer totem que atingir o estado `critical` dispara um alerta formatado no Telegram contendo Ilha, Totem, Motivo e Horário local.
- [ ] **Regra de Cooldown Anti-Spam:** Enquanto um totem permanecer em `critical`, o sistema não envia alertas duplicados dentro da janela de 15 minutos.
- [ ] **Notificação de Recuperação:** Ao restabelecer o serviço/heartbeat caído, o totem retorna para `healthy` e dispara imediatamente a mensagem de recuperação (`✅ RECUPERADO`) no Telegram.
#### 3. Segurança & Autenticação

- [ ] **Login de Usuário Único:** O acesso ao painel é bloqueado por tela de login validando a senha contra o hash `bcrypt` do `.env` e emitindo um JWT válido.
- [ ] **Rotas Protegidas:** Requisições sem JWT nas rotas do painel (incluindo o stream SSE via `@microsoft/fetch-event-source`) e requisições sem `x-api-key` na rota `POST /api/telemetry/heartbeat` retornam `401 Unauthorized`.
- [ ] **Rate Limiting & Proxy:** `@nestjs/throttler` ativo com `trust proxy` configurado, retornando `429 Too Many Requests` ao exceder os limites na rota de login e na rota de ingestão.
- [ ] **Blindagem HTTP:** `helmet` ativo, CORS restrito exclusivamente à origem da Vercel (e `localhost` em dev) e `ValidationPipe` global rejeitando campos extras (`forbidNonWhitelisted: true`).
- [ ] **Fail-Fast de Ambiente:** A API recusa iniciar caso qualquer variável obrigatória do `.env` esteja ausente ou inválida, e nenhuma credencial vaza em logs, respostas de erro ou bundle do front-end.
#### 4. Banco de Dados & Escalabilidade (_Config-Driven_)

- [ ] **Índices Criados no Atlas:** A coleção `totem_logs` possui **TTL Index** ativo (expiração automática) e **Compound Index** (`{ totemId: 1, timestamp: -1 }`) verificados no MongoDB Atlas.
- [ ] **Prova de Escalabilidade:** Ao inserir uma nova ilha de teste (ex: rascunho do _Agend.AI_) diretamente na coleção `islands`, ela é renderizada e conectada ao _Core_ automaticamente no front-end, sem alterar nenhuma linha de código no React ou criar novas rotas no NestJS.
#### 5. Qualidade, Testes & Documentação (SDD)

- [ ] **Testes Unitários & Integração:** Suíte `Jest + Supertest` passando 100% (usando container MongoDB local para testes), cobrindo obrigatoriamente:
    - [ ] Parser recursivo de tokens do n8n (LangChain, OpenAI/Groq e Gemini).
    - [ ] Máquina de estados dos totens (`healthy` / `warning` / `critical`) e _Dead Man's Switch_.
    - [ ] Lógica de cooldown e recuperação de alertas no Telegram.
    - [ ] Autenticação (JWT / `x-api-key`) e validação de DTOs.
- [ ] **Documentação Viva:** Interface do `@nestjs/swagger` gerada automaticamente e 100% fiel ao `04-api-contract.md`.
- [ ] **Padrão de Código:** Código livre de erros de TypeScript (`strict: true`), aprovado no ESLint/Prettier e versionado seguindo Conventional Commits.
#### 6. Infraestrutura & Deploy (_Out-of-Band_)

- [ ] **Deploy em Produção:** Front-end publicado na Vercel (com `vercel.json` configurado para SPA) e Back-end publicado nativamente no Render, ambos conectados ao MongoDB Atlas.
- [ ] **Keep-Alive Operacional:** Rota `GET /health` respondendo `200 OK` em `< 200ms` e monitorada pelo cronjob externo a cada 5 minutos para evitar hibernação do Render.
- [ ] **Banco Local:** `docker-compose.yml` na raiz do projeto funcional para subir o MongoDB local de desenvolvimento e testes.