# Contrato de API & Eventos SSE

## 1. Convenções Gerais, Segurança & Validação

- **Prefixo Global:** Todas as rotas de negócio utilizam o prefixo `/api`, com exceção exclusiva do healthcheck público (`GET /health`).
- **Documentação Viva (Swagger):** Disponível em `GET /api/docs` via `@nestjs/swagger`, refletindo 100% dos DTOs, headers e códigos de resposta abaixo.
- **Validação Global (`ValidationPipe`):** Configurado com `whitelist: true`, `forbidNonWhitelisted: true` e `transform: true`. Qualquer campo extra não declarado no DTO retorna `400 Bad Request`.
- **Padronização de Datas (RNF-19):** Todos os campos de data/hora trafegam estritamente em **UTC (ISO 8601)** — ex: `"2026-11-20T04:15:00.000Z"`.
- **Estratégias de Autenticação:**
    - **Painel (JWT):** Header `Authorization: Bearer <accessToken>` validado pelo `JwtAuthGuard`.
    - **Ingestão da VM (API Key):** Header `x-api-key: <INGEST_API_KEY>` validado pelo `ApiKeyGuard` (comparação segura com `crypto.timingSafeEqual`).
- **Rate Limiting (`@nestjs/throttler`):** Com `app.set('trust proxy', 1)` habilitado para leitura correta do IP real no Render.
    - **Global padrão:** `60 req/minuto` por IP.
    - **Overrides específicos:** definidos na tabela da Seção 7.

- **Formato Padrão de Erro HTTP:**
JSON
```
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["totemId must be a string"],
  "timestamp": "2026-11-20T04:15:00.000Z",
  "path": "/api/telemetry/heartbeat"
}
```
- **Trava de Escopo:** Nenhuma rota pública além de `GET /health` e `POST /api/auth/login` deve existir no MVP v1.0.

## 2. Healthcheck (Público — Keep-Alive)

### `GET /health`

Verifica a saúde da API e a conectividade ativa com o MongoDB Atlas (`connection.readyState === 1`). Consumida a cada 5 minutos pelo serviço externo de Keep-Alive (Cron-job.org / UptimeRobot).

- **Auth:** Nenhuma (Pública)
- **Rate Limit:** Global (`60/min`)
- **SLA (RNF-04):** `< 200ms`

**Response `200 OK`:**
JSON
```
{
  "status": "ok",
  "database": "connected",
  "uptime": 86400,
  "timestamp": "2026-11-20T04:15:00.000Z"
}
```

**Response `503 Service Unavailable`** _(se o MongoDB estiver desconectado)_:
JSON
```
{
  "status": "error",
  "database": "disconnected",
  "uptime": 86400,
  "timestamp": "2026-11-20T04:15:00.000Z"
}
```

## 3. Autenticação (Público)

### `POST /api/auth/login`

Valida o administrador único contra `ADMIN_USERNAME` e `ADMIN_PASSWORD_HASH` (`bcrypt`) configurados nas variáveis de ambiente.

- **Auth:** Nenhuma (Pública)
- **Rate Limit:** **`5 req/minuto`** por IP (bloqueio de força bruta)

**Request Body (`LoginDto`):**
JSON
```
{
  "username": "admin",
  "password": "********"
}
```
_Validações `class-validator`:_ `@IsString()`, `@IsNotEmpty()` em ambos os campos.

**Response `200 OK`:**
JSON
```
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": "7d"
}
```

**Erros Esperados:**

- `400 Bad Request`: Campos ausentes ou extras não permitidos.
- `401 Unauthorized`: Usuário ou senha incorretos (mensagem genérica: `"Credenciais inválidas"`).
- `429 Too Many Requests`: Limite de tentativas excedido.

## 4. Arquipélago & Totens (Protegido — JWT)

### `GET /api/islands`

Retorna a topologia completa do arquipélago já hidratada com o estado atual de cada totem (`totem_states`) e o status agregado calculado da ilha (`critical > warning > unknown > healthy`).

- **Auth:** `Authorization: Bearer <token>`
- **Regra de Segurança (RNF-13):** Nunca retornar `config` interno contendo referências de variáveis de ambiente (`supabaseKeyEnvRef`) ou chaves. Retornar apenas dados seguros de exibição.

**Response `200 OK`:**
JSON
```
{
  "generatedAt": "2026-11-20T04:15:00.000Z",
  "summary": {
    "totalTotems": 12,
    "healthy": 11,
    "warning": 1,
    "critical": 0,
    "unknown": 0
  },
  "islands": [
    {
      "slug": "core",
      "name": "Core",
      "description": "Infraestrutura principal da VM e motor n8n",
      "isCore": true,
      "order": 0,
      "status": "healthy",
      "totems": [
        {
          "totemId": "core-vm",
          "name": "VM Principal",
          "type": "vm_heartbeat",
          "iconKey": "server",
          "enabled": true,
          "tracksLlmTokens": false,
          "status": "healthy",
          "statusReason": null,
          "lastCheckAt": "2026-11-20T04:14:00.000Z",
          "lastStatusChangeAt": "2026-11-18T10:00:00.000Z",
          "lastMetrics": {
            "cpuLoad1m": 0.42,
            "ramUsedMb": 1450,
            "ramTotalMb": 4096,
            "ramUsedPercent": 35.4,
            "diskPercent": 48,
            "containers": [
              { "name": "n8n", "status": "running" },
              { "name": "portfolio-api", "status": "running" }
            ]
          }
        }
      ]
    }
  ]
}
```

### `GET /api/totems/:totemId/logs`

Retorna o histórico paginado de verificações/execuções da collection `totem_logs` (usando o Compound Index `{ totemId: 1, timestamp: -1 }`) para popular o Drawer lateral.

- **Auth:** `Authorization: Bearer <token>`
- **Query Params (`GetTotemLogsQueryDto`):**
    - `page`: inteiro `>= 1` (padrão: `1`)
    - `limit`: inteiro entre `1` e `50` (padrão: `20`)

**Response `200 OK` (Exemplo `n8n_workflow` com LLM):**
JSON
```
{
  "totemId": "taco-orchestrator",
  "type": "n8n_workflow",
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 48,
    "totalPages": 3,
    "hasNextPage": true
  },
  "tokenSummary": {
    "promptTokens": 18420,
    "completionTokens": 4190,
    "totalTokens": 22610
  },
  "logs": [
    {
      "id": "673d60f0a1b2c3d4e5f60001",
      "status": "healthy",
      "timestamp": "2026-11-20T04:10:12.000Z",
      "summary": null,
      "metrics": {
        "executionId": "9842",
        "workflowActive": true,
        "executionStatus": "success",
        "durationMs": 2340,
        "tokenUsage": {
          "promptTokens": 1240,
          "completionTokens": 310,
          "totalTokens": 1550
        }
      }
    }
  ]
}
```
_(Nota: `tokenSummary` consolida a soma dos tokens dos logs retornados no histórico disponível do totem; para totens que não utilizam LLM, `tokenSummary` é retornado como `null`.)_

**Erros Esperados:**

- `401 Unauthorized`: Token ausente ou expirado.
- `404 Not Found`: `totemId` não encontrado na coleção `islands`.

### `POST /api/totems/:totemId/check`

Dispara uma verificação sob demanda (_Force Check_) para um totem específico do tipo Pull (`http_ping`, `supabase_health`, `n8n_workflow`), persiste o resultado, atualiza `totem_states` e emite evento SSE `totem.updated`.

- **Auth:** `Authorization: Bearer <token>`
- **Rate Limit:** **`10 req/minuto`** por IP (evita sobrecarregar a API do n8n ou Supabase com cliques repetidos).
- **Request Body:** Nenhum.

**Response `200 OK`:**
JSON
```
{
  "totemId": "portfolio-api",
  "islandSlug": "portfolio",
  "status": "healthy",
  "statusReason": null,
  "lastCheckAt": "2026-11-20T04:16:05.000Z",
  "lastMetrics": {
    "statusCode": 200,
    "latencyMs": 148,
    "isReachable": true
  }
}
```

**Erros Esperados:**

- `400 Bad Request`: Tentativa de executar Force Check em totem do tipo `vm_heartbeat` (mensagem: `"Totens do tipo vm_heartbeat são atualizados via push e não suportam Force Check"`).
- `404 Not Found`: `totemId` não existe.
- `429 Too Many Requests`: Limite de Force Checks excedido.

## 5. Ingestão de Telemetria da VM (Protegido — `x-api-key`)

### `POST /api/telemetry/heartbeat`

Recebe o push periódico enviado pelo script Bash + Crontab da VM Ubuntu. Atualiza imediatamente `totem_states`, aplica a máquina de estados da VM, emite evento SSE e aplica o throttling de escrita em `totem_logs`.

- **Auth:** Header `x-api-key: <INGEST_API_KEY>`
- **Rate Limit:** **`10 req/minuto`** por IP

**Request Body (`HeartbeatDto`):**
JSON
```
{
  "totemId": "core-vm",
  "timestamp": "2026-11-20T04:15:00Z",
  "metrics": {
    "cpuLoad1m": 0.42,
    "ramUsedMb": 1450,
    "ramTotalMb": 4096,
    "diskPercent": 48,
    "containers": [
      { "name": "n8n", "status": "running" },
      { "name": "portfolio-api", "status": "running" }
    ]
  }
}
```

**Validações `class-validator` (`HeartbeatDto`):**

- `totemId`: `@IsString()`, `@IsNotEmpty()`
- `timestamp`: `@IsISO8601()`
- `metrics`: `@ValidateNested()`, `@Type(() => VmMetricsDto)`
    - `cpuLoad1m`: `@IsNumber()`, `@Min(0)`
    - `ramUsedMb`: `@IsNumber()`, `@Min(0)`
    - `ramTotalMb`: `@IsNumber()`, `@Min(1)`
    - `diskPercent`: `@IsNumber()`, `@Min(0)`, `@Max(100)`
    - `containers`: `@IsArray()`, `@ValidateNested({ each: true })` (`name: string`, `status: string`)


**Response `202 Accepted`:**
JSON
```
{
  "received": true,
  "totemId": "core-vm",
  "evaluatedStatus": "healthy",
  "serverTimestamp": "2026-11-20T04:15:01.120Z"
}
```

**Erros Esperados:**

- `400 Bad Request`: Payload malformado ou campo extra.
- `401 Unauthorized`: Header `x-api-key` ausente ou inválido.
- `404 Not Found`: `totemId` não cadastrado ou não é do tipo `vm_heartbeat`.
- `429 Too Many Requests`: Excedeu 10 req/min.

## 6. Stream em Tempo Real — SSE (Protegido — JWT)

### `GET /api/stream`

Mantém uma conexão persistente _Server-Sent Events_ (`Content-Type: text/event-stream`) consumida pelo front-end via `@microsoft/fetch-event-source` (que permite enviar o header `Authorization: Bearer <token>` sem expor o JWT na querystring).

- **Auth:** `Authorization: Bearer <token>`
- **Headers de Resposta Obrigatórios:**
    - `Content-Type: text/event-stream`
    - `Cache-Control: no-cache, no-transform`
    - `Connection: keep-alive`
    - `X-Accel-Buffering: no` _(evita buffering em proxies reversos)_

#### Eventos Emitidos pelo Servidor:

1. **`totem.updated`** _(emitido sempre que um check, heartbeat ou Dead Man's Switch atualiza um totem)_:
Plaintext
```
event: totem.updated
data: {"islandSlug":"core","islandStatus":"healthy","totem":{"totemId":"core-vm","status":"healthy","statusReason":null,"lastCheckAt":"2026-11-20T04:15:01.120Z","lastStatusChangeAt":"2026-11-18T10:00:00.000Z","lastMetrics":{"cpuLoad1m":0.42,"ramUsedMb":1450,"ramTotalMb":4096,"ramUsedPercent":35.4,"diskPercent":48,"containers":[{"name":"n8n","status":"running"}]}}}
```

2. **`ping`** _(heartbeat SSE enviado a cada **25 segundos** para impedir que o proxy do Render encerre conexões ociosas)_:
Plaintext
```
event: ping
data: {"timestamp":"2026-11-20T04:15:25.000Z"}
```

## 7. Matriz Resumo de Endpoints (Referência Rápida para Testes)

|**Método**|**Rota**|**Autenticação**|**Rate Limit**|**Descrição**|
|---|---|---|---|---|
|`GET`|`/health`|Pública|`60/min`|Healthcheck da API + status do MongoDB (Keep-Alive)|
|`GET`|`/api/docs`|Pública|`60/min`|Documentação Swagger UI gerada automaticamente|
|`POST`|`/api/auth/login`|Pública|`5/min`|Login de administrador único (retorna JWT)|
|`GET`|`/api/islands`|`Bearer JWT`|`60/min`|Topologia completa das ilhas + estados atuais dos totens|
|`GET`|`/api/totems/:totemId/logs`|`Bearer JWT`|`60/min`|Histórico paginado do totem + resumo de tokens LLM|
|`POST`|`/api/totems/:totemId/check`|`Bearer JWT`|`10/min`|Dispara Force Check manual (Pull)|
|`GET`|`/api/stream`|`Bearer JWT`|`60/min`|Stream SSE (`totem.updated` e `ping` a cada 25s)|
|`POST`|`/api/telemetry/heartbeat`|`x-api-key`|`10/min`|Ingestão de métricas da VM e containers Docker|