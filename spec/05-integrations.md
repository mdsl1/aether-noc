# Detalhes das Integrações

## 1. API REST do n8n (Pull de Execuções & Consumo de Tokens)

- **Objetivo:** Monitorar o status de workflows específicos e extrair metadados de execução, duração e consumo de tokens de nós de IA/LLM.
- **Frequência:** Dependerá do grau de criticidade do workflow, sendo de 5min a 60min 
- **Autenticação:** Header `X-N8N-API-KEY: <N8N_API_KEY>` em todas as requisições.
- **Timeout da Requisição:** `8000ms` (evita travar o loop de `@Cron` caso a VM esteja lenta).

### Endpoints Consumidos:

1. **Listagem / Verificação de Workflow Ativo:**
    - `GET {N8N_BASE_URL}/api/v1/workflows/{workflowId}`
    - Valida se `active === true`. Se um workflow esperado estiver desativado manualmente, o totem entra em estado `warning`.

2. **Histórico de Execuções:**
    - `GET {N8N_BASE_URL}/api/v1/executions?workflowId={workflowId}&limit=10&includeData=true`
    - _Otimização de Payload:_ O back-end deve manter em cache ou comparar pelo último `executionId` processado para não reprocessar execuções antigas já salvas no `totem_logs`.

### Regra de Parsing de Tokens LLM (Crítico):

- Como workflows com **AI Agents** executam múltiplas chamadas ao modelo de linguagem em uma única execução, o parser no NestJS deve varrer recursivamente o objeto `data.resultData.runData` somando todas as ocorrências encontradas.

- **Chaves suportadas pelo parser:**
    - Formato LangChain / n8n AI Nodes: `tokenUsage.promptTokens`, `tokenUsage.completionTokens`, `tokenUsage.totalTokens`
    - Formato OpenAI / Groq: `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens`
    - Formato Gemini: `usageMetadata.promptTokenCount`, `usageMetadata.candidatesTokenCount`, `usageMetadata.totalTokenCount`

- **Saída Normalizada:**
    
    JSON
```
{
     "promptTokens": 1240,
     "completionTokens": 310,
     "totalTokens": 1550
}
```
_(Caso o workflow não utilize LLMs, o campo `tokenUsage` é omitido ou salvo como `null`)._

## 2. Heartbeat da VM & Containers (Push via Script Bash + Crontab)

- **Objetivo:** Monitorar saúde da VM (CPU, RAM, Disco) e status dos containers Docker (`n8n`, `api-nestjs`, etc.) de forma independente do n8n.
- **Frequência:** A cada 2 a 5 minutos via `crontab` no host Ubuntu.
- **Endpoint no Back-end:** `POST /api/telemetry/heartbeat`
- **Autenticação:** Header `x-api-key: <INGEST_API_KEY>`
- **Rate Limit (Token Bucket):** Máximo de 10 requisições por minuto por IP.

### Contrato de Payload Enviado pela VM:

JSON

```
{
  "totemId": "core-vm",
  "timestamp": "2026-11-17T22:15:00Z",
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

### Regras de Avaliação do Heartbeat:

- **Timeout (Dead Man's Switch):** Um `@Cron` no NestJS roda a cada 5min, verificando `lastCheckAt` do totem `core-vm`. Se `now - lastCheckAt > ((frequência do crontab × 2) + margem)`, o totem transiciona automaticamente para `critical` com motivo `"Heartbeat timeout: VM inacessível ou travada"`.
    
- **Thresholds de Recursos:**
    - `ramUsedPercent >= 90%` ou `diskPercent >= 90%` -> `critical`
    - `ramUsedPercent >= 80%` ou `diskPercent >= 80%` -> `warning`
    - Algum container esperado ausente ou diferente de `"running"` -> `critical`

## 3. Healthcheck HTTP & Supabase (Pull para Sites, APIs e Bancos)

- **Objetivo:** Verificar disponibilidade do front-end (GitHub Pages/Vercel), back-ends (Render/VM) e evitar pausa por inatividade no Supabase.
- **Frequência:** Configurável por totem (padrão: a cada 20 minutos).
- **Execução:** `GET {targetUrl}` com timeout de `10000ms`.

### Regras por Tipo de Alvo:

- **Website / API (`http_ping`):**
    
    - Status HTTP `200..299` e latência `< 3000ms` -> `healthy`
    - Status HTTP `200..299` e latência `>= 3000ms` -> `warning`
    - Status `>= 400`, `5xx` ou `Timeout/Network Error` -> falha contabilizada na máquina de estados.
        
- **Supabase (`supabase_health`):**
    
    - Requisição `GET {SUPABASE_URL}/rest/v1/` com header `apikey` resolvido via `ConfigService.get(config.supabaseKeyEnvRef)` (permitindo monitorar projetos distintos como o do Portfólio e o `banco-taco` do T.A.C.O.)..
    - Além de validar disponibilidade (`200 OK`), o tráfego mantém o projeto ativo no plano gratuito.

## 4. Telegram Bot API (Alertas Proativos)

- **Objetivo:** Notificar imediatamente quando qualquer totem entrar em estado `critical` ou se recuperar (`healthy` após um `critical`).
- **Endpoint:** `POST https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage`
- **Payload:**
    
    JSON
```
{
      "chat_id": "{TELEGRAM_CHAT_ID}",
      "parse_mode": "Markdown",
      "text": "🚨 *[A.E.T.H.E.R.] ALERTA CRÍTICO*\n\n*Ilha:* Core\n*Totem:* VM Principal\n*Motivo:* Heartbeat timeout (> 3 min sem resposta)\n*Horário:* 17/11/2026 22:18"
}
```

### Regra de Cooldown Anti-Spam:

- O back-end deve armazenar `lastAlertSentAt` em `totem_states`.
- **Regra:** Enquanto um totem permanecer em `critical`, **não** enviar novo alerta se `now - lastAlertSentAt < 15 minutos`.
- **Notificação de Recuperação:** Quando um totem em `critical` voltar para `healthy`, enviar uma mensagem verde (`✅ *[A.E.T.H.E.R.] RECUPERADO*`) imediatamente, zerando o ciclo de alerta.

## 5. Keep-Alive Externo (Render Anti-Sleep)

- **Objetivo:** Impedir que a instância gratuita do Render hiberne após 15 minutos de ociosidade, garantindo que os `@Cron` internos nunca parem.
- **Provedor:** Cron-job.org ou UptimeRobot (Free Tier).
- **Configuração:** `GET https://{RENDER_API_URL}/health` a cada **5 minutos**.
- **Resposta Esperada (`200 OK`):**
    
    JSON
```
{
      "status": "ok",
      "uptime": 86400,
      "timestamp": "2026-11-17T22:15:00Z"
}
```