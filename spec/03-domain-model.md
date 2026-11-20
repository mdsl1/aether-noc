# Modelo de Domínio & Regras de Negócio

## 1. Enums e Tipos Compartilhados do Domínio

Estes tipos devem ser centralizados em um módulo compartilhado (`src/common/types/domain.types.ts`) para garantir tipagem estrita entre Schemas do Mongoose, DTOs, Checkers e eventos SSE:

TypeScript
```
export enum TotemStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown', // Estado inicial antes da 1ª checagem
}

export enum TotemType {
  VM_HEARTBEAT = 'vm_heartbeat',
  HTTP_PING = 'http_ping',
  N8N_WORKFLOW = 'n8n_workflow',
  SUPABASE_HEALTH = 'supabase_health',
}

export enum IconKey {
  SERVER = 'server',
  N8N = 'n8n',
  GLOBE = 'globe',
  API = 'api',
  DATABASE = 'database',
  AI_AGENT = 'ai_agent',
  BACKUP = 'backup',
}
```

## 2. Modelagem das Collections (MongoDB Atlas / Mongoose)

A modelagem separa **configuração estática** (`islands`), **estado quente/atual** (`totem_states`) e **histórico frio/temporal** (`totem_logs`). Essa separação evita reescrever documentos grandes da ilha a cada ping e permite manter o histórico enxuto via **TTL Index**.

> **Regra de Segurança (RNF-13):** Nenhuma credencial sensível (`N8N_API_KEY`, `SUPABASE_ANON_KEY`, etc.) deve ser salva em texto puro no MongoDB. O campo `config` de cada totem armazena apenas URLs públicas, IDs de workflow ou o **nome da variável de ambiente** (ex: `envKeyRef: "SUPABASE_PORTFOLIO_ANON_KEY"`) que o back-end resolve via `ConfigService`.

### 2.1. Collection `islands` (Topologia & Configuração — _Config-Driven_)

Armazena a definição das ilhas e a lista embutida de totens que pertencem a ela. Leitura frequente, escrita rara (apenas via seed ou parametrização).

TypeScript
```
// Subdocumento embutido em Island
export interface TotemConfig {
  totemId: string;              // Slug único global (ex: "core-vm", "taco-orchestrator")
  name: string;                 // Nome de exibição (ex: "VM Principal")
  type: TotemType;              // Define qual Strategy Checker será instanciado
  iconKey: IconKey;             // Chave do Pixel SVG no front-end
  checkIntervalMinutes: number; // Frequência do @Cron Pull (ignorado no vm_heartbeat)
  enabled: boolean;             // Permite pausar monitoramento sem apagar o totem

  // Configuração específica por tipo (validada na camada de domínio)
  config: {
    // Para http_ping
    targetUrl?: string;
    expectedStatusMin?: number;       // Padrão: 200
    expectedStatusMax?: number;       // Padrão: 299
    warningLatencyMs?: number;        // Padrão: 3000

    // Para supabase_health
    supabaseUrl?: string;
    supabaseKeyEnvRef?: string;       // Nome da env var contendo a ANON_KEY

    // Para n8n_workflow
    workflowId?: string;              // ID do workflow na instância n8n
    tracksLlmTokens?: boolean;        // Indica se o Drawer deve exibir card de tokens

    // Para vm_heartbeat
    expectedContainers?: string[];    // Ex: ["n8n", "portfolio-api"]
    heartbeatTimeoutMinutes?: number; // Padrão: 12 (Dead Man's Switch)
    ramWarningPercent?: number;       // Padrão: 80
    ramCriticalPercent?: number;      // Padrão: 90
    diskWarningPercent?: number;      // Padrão: 80
    diskCriticalPercent?: number;     // Padrão: 90
  };
}

// Documento principal da collection `islands`
export interface IslandDocument {
  _id: ObjectId;
  slug: string;          // Único (ex: "core", "portfolio", "taco", "ops-backup")
  name: string;          // Ex: "Core", "T.A.C.O."
  description?: string;
  isCore: boolean;       // Apenas 1 ilha pode ter isCore = true (centro do arquipélago)
  order: number;         // Ordem determinística no posicionamento orbital
  totems: TotemConfig[];
  createdAt: Date;
  updatedAt: Date;
}
```
- **Índices em `islands`:**
    - `{ slug: 1 }` — `unique: true`
    - `{ "totems.totemId": 1 }` — `unique: true, sparse: true` (garante unicidade global de `totemId`)

### 2.2. Collection `totem_states` (Estado Atual & Controle de Alertas)

Mantém exatamente **1 documento por totem** com o snapshot mais recente. É a fonte de verdade para montar o payload inicial do painel (`GET /api/islands`), emitir eventos SSE (`totem.updated`) e controlar o cooldown de alertas no Telegram.

TypeScript
```
export interface TotemStateDocument {
  _id: ObjectId;
  totemId: string;                  // Referência única ao TotemConfig.totemId
  islandSlug: string;               // Desnormalizado para montagem rápida de alertas/SSE
  status: TotemStatus;              // Estado atual ('healthy' | 'warning' | 'critical' | 'unknown')
  previousStatus: TotemStatus;      // Estado anterior (usado para detectar transições/recuperação)
  statusReason: string | null;      // Ex: "Heartbeat timeout (> 12 min sem resposta)" ou "Latência alta (3420ms)"

  // Controle de Máquina de Estados & Deduplicação
  consecutiveFailures: number;      // Contador anti-flapping (resetado para 0 em caso de sucesso)
  lastCheckAt: Date | null;         // Timestamp UTC da última checagem ou heartbeat recebido
  lastStatusChangeAt: Date | null;  // Timestamp UTC da última troca real de status
  lastProcessedExecutionId?: string;// Apenas n8n_workflow: evita reprocessar execuções já logadas

  // Controle de Alertas Telegram (Anti-Spam)
  lastAlertSentAt: Date | null;     // Timestamp UTC do último alerta crítico disparado
  alertActive: boolean;             // true enquanto houver um incidente crítico não recuperado

  // Snapshot leve para exibição imediata no Tooltip e cabeçalho do Drawer
  lastMetrics: Record<string, any> | null;
  updatedAt: Date;
}
```
- **Índices em `totem_states`:**
    - `{ totemId: 1 }` — `unique: true`
    - `{ islandSlug: 1 }` — acelera agrupamento por ilha

### 2.3. Collection `totem_logs` (Histórico Temporal com TTL)

Armazena os registros históricos exibidos no Drawer lateral ao clicar em um totem. Todo documento **deve** ser leve (sem payloads brutos de prompts/respostas do n8n).

TypeScript
```
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface TotemLogDocument {
  _id: ObjectId;
  totemId: string;
  type: TotemType;
  status: TotemStatus;       // Status calculado naquela verificação/execução
  timestamp: Date;           // UTC (usado no Compound Index e no TTL Index)
  summary?: string;          // Mensagem curta de erro ou evento (máx. 300 chars)

  // Payload discriminado conforme `type` (apenas o bloco correspondente é preenchido)
  metrics: {
    // Se type === 'vm_heartbeat'
    cpuLoad1m?: number;
    ramUsedMb?: number;
    ramTotalMb?: number;
    ramUsedPercent?: number;
    diskPercent?: number;
    containers?: Array<{ name: string; status: string }>;

    // Se type === 'http_ping' ou 'supabase_health'
    statusCode?: number | null;
    latencyMs?: number;
    isReachable?: boolean;

    // Se type === 'n8n_workflow'
    executionId?: string;
    workflowActive?: boolean;
    executionStatus?: 'success' | 'error' | 'crashed' | 'waiting';
    durationMs?: number;
    tokenUsage?: TokenUsage | null;
  };
}
```

- **Índices Obrigatórios em `totem_logs` (RNF-07):**
    - **Compound Index:** `{ totemId: 1, timestamp: -1 }` — garante paginação instantânea no Drawer (`< 300ms`).
    - **TTL Index:** `{ timestamp: 1 }` com `{ expireAfterSeconds: 1209600 }` (14 dias — configurável entre 7 e 15 dias).
    - **Índice Único Parcial (Deduplicação n8n):** `{ totemId: 1, "metrics.executionId": 1 }` com `{ unique: true, partialFilterExpression: { "metrics.executionId": { $exists: true } } }` — impede duplicidade de logs de uma mesma execução do n8n mesmo em chamadas simultâneas (_Cron_ + _Force Check_).

## 3. Máquina de Estados dos Totens & Regras de Transição

### 3.1. Ciclo de Vida dos Estados

- Todo totem recém-cadastrado nasce com `status: 'unknown'` e `consecutiveFailures: 0`.
- Qualquer mudança de `status` (ou atualização de `lastMetrics` relevante) emite um evento interno via `@nestjs/event-emitter` (`totem.updated`), que dispara o envio SSE para os clientes conectados.

### 3.2. Regras de Avaliação por Tipo de Checker

#### A) `http_ping` e `supabase_health` (Com Proteção Anti-Flapping)

Para evitar falsos alarmes causados por micro-oscilações momentâneas de rede, falhas de HTTP exigem **2 falhas consecutivas** para entrar em `critical`:

|**Condição Coletada**|**consecutiveFailures**|**Novo Status**|**statusReason**|
|---|---|---|---|
|HTTP `200..299` e `latencyMs < 3000`|Reset para `0`|`healthy`|`null`|
|HTTP `200..299` e `latencyMs >= 3000`|Reset para `0`|`warning`|`"Latência elevada ({latencyMs}ms)"`|
|HTTP `>= 400`, `5xx`, Timeout ou Erro de Rede|Incrementa (`+1`), se `=== 1`|`warning`|`"Falha temporária ({statusCode ou erro}) — 1/2"`|
|HTTP `>= 400`, `5xx`, Timeout ou Erro de Rede|Incrementa (`+1`), se `>= 2`|`critical`|`"Serviço indisponível ({statusCode ou erro})"`|

_(Nota: Em uma ação manual de **Force Check**, se o serviço falhar, incrementa normalmente o contador; se responder OK, reseta imediatamente para `healthy`.)_

#### B) `vm_heartbeat` (Push + _Dead Man's Switch_)

Não usa anti-flapping: qualquer anomalia de container ou timeout vai direto para `critical`.

|**Condição Coletada (ordem de prioridade)**|**Novo Status**|**statusReason**|
|---|---|---|
|**Dead Man's Switch:** `now - lastCheckAt > heartbeatTimeoutMinutes` (padrão `12 min`)|`critical`|`"Heartbeat timeout (> 12 min sem resposta)"`|
|Algum container em `expectedContainers` está ausente ou com `status !== 'running'`|`critical`|`"Container(s) fora do ar: {lista}"`|
|`ramUsedPercent >= 90` ou `diskPercent >= 90`|`critical`|`"Recurso crítico: RAM {x}% / Disco {y}%"`|
|`ramUsedPercent >= 80` ou `diskPercent >= 80`|`warning`|`"Uso elevado: RAM {x}% / Disco {y}%"`|
|Demais casos|`healthy`|`null`|

- **Execução do Dead Man's Switch:** Um `@Cron` leve no NestJS roda a cada **1 minuto** consultando todos os totens habilitados do tipo `vm_heartbeat` cujo `status !== 'critical'`. Se o tempo limite foi ultrapassado, força a transição para `critical`, grava um registro de timeout em `totem_logs` e aciona o serviço de alertas do Telegram.
    

#### C) `n8n_workflow` (Pull API REST)

|**Condição Coletada (ordem de prioridade)**|**Novo Status**|**statusReason**|
|---|---|---|
|API do n8n inacessível / Timeout (`8000ms`) por `2` checks seguidos|`critical`|`"API do n8n inacessível"`|
|Última execução registrada tem status `'error'` ou `'crashed'`|`critical`|`"Falha na execução #{executionId}: {erro resumido}"`|
|Workflow está desativado (`active === false`) no n8n|`warning`|`"Workflow desativado no n8n"`|
|Última execução teve status `'success'` e workflow está ativo (`active === true`)|`healthy`|`null`|
|Workflow ativo sem nenhuma execução recente encontrada|Mantém status atual (ou `healthy` se `unknown`)|`null`|

### 3.3. Regra de Agregação de Saúde da Ilha (Computed)

O status geral de uma ilha (usado na cor da **Corrente Arcana** e no badge da ilha) **não** é salvo no banco; é calculado dinamicamente pela prioridade da pior saúde entre seus totens ativos (`enabled: true`):

$$\text{critical} > \text{warning} > \text{unknown} > \text{healthy}$$

## 4. Regras do Ciclo de Alertas (Telegram Cooldown & Recuperação)

O `AlertService` escuta o evento interno `totem.updated` e aplica a seguinte máquina de decisão determinística:

1. **Disparo de Alerta Crítico (`🚨 ALERTA CRÍTICO`):**
    - **Condição:** `newStatus === 'critical'` **E** (`!state.alertActive` **OU** `now - state.lastAlertSentAt >= 15 minutos`).
    - **Ação:** Envia mensagem formatada para a Telegram Bot API (horário convertido para `America/Sao_Paulo`), atualiza `state.alertActive = true` e `state.lastAlertSentAt = now`.
2. **Supressão por Cooldown (Anti-Spam):**
    - **Condição:** `newStatus === 'critical'` **E** `state.alertActive === true` **E** `now - state.lastAlertSentAt < 15 minutos`.
    - **Ação:** Não envia mensagem no Telegram (apenas registra log estruturado `DEBUG` no NestJS).
3. **Disparo de Recuperação (`✅ RECUPERADO`):**
    - **Condição:** `newStatus === 'healthy'` **E** `state.alertActive === true`.
    - **Ação:** Envia imediatamente a mensagem de recuperação no Telegram (independente do tempo de cooldown) e atualiza `state.alertActive = false`.
4. **Estados Intermediários (`warning` / `unknown`):**
    - Não disparam mensagens no Telegram no MVP (visíveis apenas no painel e nas runas âmbar) para evitar fadiga de alertas.

## 5. Regras de Agendamento & Otimização de Escrita (Free Tier M0)

1. **Agendador Mestre (`SchedulerService`):**
    - Um único `@Cron('* * * * *')` roda a cada 1 minuto.
    - Busca todos os totens com `enabled: true` e `type !== 'vm_heartbeat'`.
    - Filtra apenas aqueles onde `lastCheckAt === null` ou `now - lastCheckAt >= checkIntervalMinutes`.
    - Executa todos os checkers filtrados em paralelo com **`Promise.allSettled()`** (RNF-02).
2. **Throttling de Logs do Heartbeat (`vm_heartbeat`):**
    - Todo heartbeat recebido atualiza imediatamente `totem_states` (mantendo o painel 100% em tempo real via SSE).
    - Para economizar espaço no MongoDB Atlas, um novo documento em `totem_logs` só é inserido se: **(a)** houve mudança de status, **(b)** o status atual é `warning` ou `critical`, ou **(c)** se passaram `>= 10 minutos` desde o último log salvo desse totem.
3. **Truncamento de Mensagens de Erro:**
    - Qualquer `summary` / `errorMessage` salvo no banco deve ser truncado em no máximo **300 caracteres** para impedir que stack traces gigantes inflem a collection `totem_logs`.

## 6. Seed Inicial do Arquipélago (`seed.ts` — MVP v1.0)

| **Ilha (slug)** | **isCore** | **Totem (totemId)**      | **type**          | **iconKey** | **checkIntervalMinutes**    |
| --------------- | ---------- | ------------------------ | ----------------- | ----------- | --------------------------- |
| `core`          | `true`     | `core-vm`                | `vm_heartbeat`    | `server`    | _(Push 2–5m / Timeout 12m)_ |
| `core`          | `true`     | `core-n8n`               | `http_ping`       | `n8n`       | `5`                         |
| `portfolio`     | `false`    | `portfolio-web`          | `http_ping`       | `globe`     | `20`                        |
| `portfolio`     | `false`    | `portfolio-api`          | `http_ping`       | `api`       | `15`                        |
| `portfolio`     | `false`    | `portfolio-n8n-contact`  | `n8n_workflow`    | `n8n`       | `15`                        |
| `portfolio`     | `false`    | `portfolio-db`           | `supabase_health` | `database`  | `20`                        |
| `taco`          | `false`    | `taco-orchestrator`      | `n8n_workflow`    | `ai_agent`  | `5`                         |
| `taco`          | `false`    | `taco-finance`           | `n8n_workflow`    | `ai_agent`  | `10`                        |
| `taco`          | `false`    | `taco-council`           | `n8n_workflow`    | `ai_agent`  | `10`                        |
| `taco`          | `false`    | `n8n-db`                 | `supabase_health` | `database`  | `20`                        |
| `ops-backup`    | `false`    | `ops-supabase-keepalive` | `n8n_workflow`    | `database`  | `60`                        |
| `ops-backup`    | `false`    | `ops-n8n-backup`         | `n8n_workflow`    | `backup`    | `60`                        |
