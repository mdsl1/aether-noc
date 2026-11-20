# Especificação de Design & UI

## 1. Identidade Visual & Direção de Arte

- **Tema Oficial (MVP v1.0):** **Dark Fantasy em Pixel Art (32-bit moderno)**.
- **Atmosfera:** Céu crepuscular/noturno em tons de índigo profundo, roxo abissal e névoa violeta. Ilhas flutuantes compostas por rocha escura/obsidiana com **vegetação orgânica de fantasia sombria** (grama em tons de verde-musgo escuro, musgo nos pés dos totens e vinhas penduradas nas bordas da rocha). conectadas à ilha central (_Core_) por correntes colossais de ferro com runas arcanas brilhantes.
- **Regra de Renderização Pixel Art:** Todos os sprites (ilhas, obeliscos/totens e ícones customizados) devem aplicar obrigatoriamente `image-rendering: pixelated` (ou classe utilitária `.pixel-art`) para evitar borramento (_anti-aliasing_) durante o zoom do `react-zoom-pan-pinch`.
- **Trava de Escopo (Temas):** O tema alternativo _"Amanhecer Distópico"_ está reservado exclusivamente para a **v0.2**. No MVP v1.0, **não** implementar seletor de temas (_theme switcher_), mas manter todas as cores centralizadas em CSS Variables / `tailwind.config` para facilitar a futura tematização.

## 2. Design Tokens (`tailwind.config` & CSS Variables)

### 2.1. Paleta de Cenário e Superfícies (UI)

|**Token**|**Hex / Valor**|**Uso Principal**|
|---|---|---|
|`--bg-sky-top`|`#090B1A`|Topo do céu noturno (espaço profundo)|
|`--bg-sky-mid`|`#161233`|Meio do céu crepuscular (índigo escuro)|
|`--bg-sky-mist`|`#2E1A47`|Névoa violeta na base do arquipélago|
|`--surface-glass`|`rgba(15, 18, 36, 0.82)`|Fundo do Drawer, HUD superior e card de Login (`backdrop-blur-md`)|
|`--surface-card`|`rgba(24, 29, 56, 0.75)`|Cards internos do Drawer (métricas, execuções, containers)|
|`--border-arcane`|`rgba(139, 92, 246, 0.28)`|Bordas sutis de UI (violeta translúcido)|
|`--text-primary`|`#F1F5F9`|Títulos, valores de métricas e labels principais|
|`--text-secondary`|`#94A3B8`|Subtítulos, metadados e timestamps secundários|

### 2.2. Paleta Semântica dos Estados (Totens & Runas)

|**Estado**|**Cor Principal**|**Cor de Glow (drop-shadow)**|**Fundo de Badge**|**Animação Padrão**|
|---|---|---|---|---|
|`healthy`|`#10B981` (Esmeralda)|`rgba(16, 185, 129, 0.65)`|`bg-emerald-500/15`|Brilho estático ou respiração muito suave (`4s`)|
|`warning`|`#F59E0B` (Âmbar)|`rgba(245, 158, 11, 0.75)`|`bg-amber-500/15`|Pulso cadenciado (`2s ease-in-out infinite`)|
|`critical`|`#EF4444` (Carmesim)|`rgba(239, 68, 68, 0.90)`|`bg-red-500/20`|Pulso rápido de alerta (`0.9s infinite`) + anel de aura|
|`unknown`|`#64748B` (Ardósia)|`none`|`bg-slate-500/15`|Sem brilho / apagado (estado inicial antes do 1º check)|

### 2.3. Paleta das Correntes Arcanas (`<ArcaneChain/>`)

- **Elo Metálico Base:** `#262B40` com contorno `#0D0F1A`.
- **Energia Saudável (Ilha OK):** Pulso de runas em Ciano (`#38BDF8`) e Violeta (`#A855F7`).
- **Energia Instável (Ilha com `warning`):** Pulso em Âmbar (`#F59E0B`).
- **Energia Rompida/Alerta (Ilha com `critical`):** Corrente piscando em Carmesim (`#EF4444`) ou energia oscilando com falha.

### 2.4. Tipografia (Google Fonts)

|**Papel**|**Fonte**|**Pesos**|**Uso**|
|---|---|---|---|
|**Display / Fantasia**|`Silkscreen` ou `Cinzel`|`700`|Logo **A.E.T.H.E.R.** e títulos/placas das Ilhas|
|**Interface (UI)**|`Inter`|`400, 500, 600`|Textos do Drawer, botões, tooltips e mensagens de erro|
|**Dados / Telemetria**|`JetBrains Mono`|`400, 600`|CPU/RAM, latência (`ms`), códigos HTTP, contagem de tokens LLM e datas|

## 3. Estratégia Híbrida de Assets & Estrutura de Arquivos

Para manter performance de 60fps sem depender de engines de jogos (conforme Escopo Negativo), a cena combina **sprites estáticos em pixel art** com **SVG dinâmico** e **CSS**:

1. **Sprites Pixel Art (WebP/PNG com fundo transparente):**
    - `island-core.webp`: Ilha central maior de obsidiana (base ~340px × 260px).
    - `island-satellite-a.webp` e `island-satellite-b.webp`: 2 variações de ilhas satélites (base ~240px × 190px), alternadas por índice para quebrar repetição visual.
    - `totem-base.webp`: O componente `<Totem/>` utiliza uma base única (`totem-base.webp`) combinada com um registro de **Pixel SVGs** (`src/components/totems/pixelGlyphs.tsx`) renderizados com `shape-rendering="crispEdges"` e `fill="currentColor"`. Cada totem no banco define qual ícone exibir através de uma propriedade `iconKey` (ex: `server`, `n8n`, `globe`, `api`, `database`, `ai_agent`, `backup`), mantendo o front-end 100% orientado a dados.
2. **SVG Inline Dinâmico:**
    - Usado nas **Correntes Arcanas** (`<ArcaneChain/>`) para calcular curvas de Bézier entre quaisquer coordenadas `(x, y)` e alterar a cor das runas em tempo real via CSS.
3. **CSS Puro (Camada de Fundo):**
    - Céu com `linear-gradient(180deg, #090B1A 0%, #161233 55%, #2E1A47 100%)`.
    - Estrelas sutis via `radial-gradient` repetido ou SVG leve.
    - Névoa inferior estática ou com deslocamento horizontal muito lento (`opacity: 0.35`, GPU-accelerated via `transform: translateX`).

Plaintext

```
src/
  assets/
    sprites/
      island-core.webp
      island-satellite-a.webp
      island-satellite-b.webp
      totem-base.webp
```

## 4. Canvas Interativo, Camadas e Algoritmo Orbital

### 4.1. Configuração do `react-zoom-pan-pinch`

O arquipélago vive dentro de um _world container_ de tamanho virtual fixo (ex: `2000px × 1400px`) centralizado na viewport inicial:

- `initialScale`: `1` (desktop) | `0.65` (mobile `< 768px`)
- `minScale`: `0.45`
- `maxScale`: `2.0`
- `centerOnInit`: `true`
- `limitToBounds`: `false` (com margem suave para o usuário arrastar livremente sem perder o arquipélago)
- **Ação de Resgate:** Botão flutuante no HUD para chamar `centerView(1, 300, 'easeOut')`.

### 4.2. Hierarquia de Camadas (`z-index`)

|**Camada**|**z-index**|**Conteúdo**|
|---|---|---|
|Fundo do Céu|`z-0`|Gradiente noturno, estrelas e névoa (fixo na viewport)|
|Correntes Arcanas|`z-10`|`<svg>` cobrindo o _world container_ com todas as `<ArcaneChain/>`|
|Ilhas & Totens|`z-20`|Componentes `<Island/>` posicionados absolutamente no _world container_|
|Tooltips de Hover|`z-30`|Popover flutuante ao passar o mouse sobre um `<Totem/>`|
|HUD Superior|`z-40`|Barra flutuante fixa no topo da tela|
|Drawer & Modais|`z-50`|`<TotemDrawer/>` e backdrop escuro ao abrir detalhes|

### 4.3. Algoritmo de Posicionamento Elíptico (Zero Hardcode)

A ilha com `isCore: true` fica sempre ancorada no centro do _world container_ `(cx, cy)`. Todas as `N` ilhas satélites retornadas pela API são distribuídas automaticamente em uma elipse ao redor do _Core_:

TypeScript

```
const CENTER_X = 1000;
const CENTER_Y = 700;
const RADIUS_X = 520; // Maior na horizontal para telas 16:9
const RADIUS_Y = 320;

// Para N = 4, offset = Math.PI / 4 posiciona exatamente nos 4 cantos (X simétrico)
const angleOffset = satelliteIslands.length === 4 ? Math.PI / 4 : -Math.PI / 2;

const position = satelliteIslands.map((island, index) => {
  const theta = (2 * Math.PI * index) / satelliteIslands.length + angleOffset;
  return {
    ...island,
    x: CENTER_X + RADIUS_X * Math.cos(theta),
    y: CENTER_Y + RADIUS_Y * Math.sin(theta),
  };
});
```

_Se `N > 6` no futuro, o algoritmo pode expandir `RADIUS_X` e `RADIUS_Y` proporcionalmente (`+ 45 * (N - 6)`) para evitar qualquer colisão visual._

### 4.4. Física de Flutuação (`Framer Motion`)

- Cada `<Island/>` aplica animação apenas em `y`: `animate={{ y: [-6, 6, -6] }}`.
- Duração alternada entre `4.5s` e `6.5s` com `delay: index * 0.6` e `ease: "easeInOut"`, `repeat: Infinity`, garantindo movimento orgânico e dessincronizado.
- **Acessibilidade:** Usar `useReducedMotion()` do Framer Motion; se ativo no sistema operacional, desabilitar a flutuação contínua mantendo apenas transições de opacidade.

## 5. Especificação Detalhada dos Componentes

### 5.1. HUD Superior (`<TopHud/>`)

Barra compacta flutuante (`h-14`, `fixed top-4 left-4 right-4`), estilo _glassmorphism_ escuro com borda arcana:

- **Esquerda:** Logo/Nome **A.E.T.H.E.R.** + indicador de conexão SSE em tempo real:
    - `connected`: bolinha verde + `"Tempo Real"`
    - `reconnecting`: bolinha âmbar piscando + `"Reconectando..."`
    - `disconnected`: bolinha vermelha + `"Offline"`
- **Centro (oculto em mobile muito estreito):** Resumo global dinâmico (ex: `10/11 Totens Saudáveis` ou badge vermelho `1 Alerta Crítico` clicável para focar a câmera na ilha afetada).
- **Direita:** Botão **"Recentralizar"** (`Crosshair` / `LocateFixed`) + Botão **"Sair"** (`LogOut`).

### 5.2. Ilha Genérica (`<Island/>`)

Componente único e reutilizável (proibido criar `<TacoIsland/>` ou similares):

- **Placa de Identificação:** Badge posicionado logo abaixo ou acima da plataforma de pedra exibindo `island.name` (fonte Display) e um pequeno indicador da pior saúde agregada entre seus totens (`critical > warning > unknown > healthy`).
- **Grid de Totens:** Área superior plana da ilha contendo os componentes `<Totem/>` dispostos em arco ou linha centralizada (`flex justify-center gap-3 flex-wrap`), comportando confortavelmente de 1 a 5 totens por ilha.

### 5.3. Corrente Arcana (`<ArcaneChain/>`)

- Renderizada como um `<path>` SVG ligando `(CENTER_X, CENTER_Y)` até `(island.x, island.y)`.
- **Curva de Peso (Catenária simulada):** Curva de Bézier quadrática `M x1,y1 Q cx,cy x2,y2`, onde o ponto de controle `cy` recebe um deslocamento para baixo (`+60px` a `+90px`) simulando a gravidade da corrente pesada.
- **Camadas do `<path>`:**
    1. Traço base grosso tracejado (`stroke-dasharray`) representando os elos de ferro escuro.
    2. Traço interno mais fino com filtro `drop-shadow` e animação `stroke-dashoffset` representando o fluxo de energia mágica correndo do _Core_ para a ilha (cor determinada pelo pior status da ilha conectada).

### 5.4. Totem / Obelisco (`<Totem/>`)

Elemento clicável (`<button>` acessível com `aria-label` e suporte a foco via teclado):

- **Composição Visual em 2 Camadas (Cena):**
    1. **Camada Base:** Sprite estático `totem-base.webp` (monólito de pedra escura com musgo na base, renderizado com `.pixel-art`).
    2. **Camada da Runa (Pixel SVG):** Ícone pixelizado embutido no centro da pedra, carregado dinamicamente do registro `src/components/totems/pixelGlyphs.tsx` (`shape-rendering="crispEdges"` e `fill="currentColor"`) a partir da propriedade `iconKey` do totem (`server`, `n8n`, `globe`, `api`, `database`, `ai_agent`, `backup`).
- **Estados & Animação:** O brilho (`drop-shadow`), a cor e a velocidade de pulso por estado (`healthy`, `warning`, `critical`, `unknown`) são aplicados diretamente sobre a camada do **Pixel SVG**, simulando uma runa gravada na pedra que reage à saúde do serviço.
- **Regra de Separação de Ícones:** Ícones vetoriais do `Lucide React` **não** devem ser renderizados sobre o sprite do monólito na cena; eles ficam restritos exclusivamente às superfícies de UI limpa (Tooltip, Drawer, HUD e Login).
- **Acessibilidade por Estado (RNF-18):** Nunca depender apenas de cor. Cada estado combina cor do brilho + velocidade de pulso na runa + ícone auxiliar do `Lucide React` (`CheckCircle2`, `AlertTriangle`, `XOctagon`, `HelpCircle`) e rótulo textual no Tooltip e no Drawer.
- **Hover Tooltip (Desktop):** Pequeno card escuro (`--surface-glass`) exibido acima do totem contendo:
    - Nome do Totem
    - Pill de status com ícone do `Lucide React` + texto (`Saudável` / `Instável` / `Crítico` / `Desconhecido`)
    - Resumo rápido (ex: `RAM 35%`, `200 OK • 142ms` ou `Última exec: Sucesso`)
    - Tempo relativo da última checagem (`há 2 min`)

## 6. Telas e Drawer de Detalhes

### 6.1. Tela de Login (`/login`)

- **Cenário:** Mesmo fundo de céu crepuscular com névoa sutil ao fundo.
- **Card Central (`max-w-sm`):** _Glassmorphism_ escuro, borda arcana, título **A.E.T.H.E.R.** e subtítulo discreto (_"Portal de Observabilidade"_).
- **Formulário:**
    - Campos de usuário e senha (conforme contrato da API) com botão de mostrar/ocultar senha.
    - Botão primário com estado de _loading_ (`Autenticando...`).
- **Tratamento de Erros Visuais:**
    - `401 Unauthorized`: Mensagem em vermelho suave `"Credenciais inválidas."`
    - `429 Too Many Requests`: Mensagem em âmbar `"Muitas tentativas. Aguarde 1 minuto antes de tentar novamente."`

### 6.2. Drawer de Detalhes (`<TotemDrawer/>`)

- **Responsividade (RNF-17):**
    - **Desktop (`>= 768px`):** Painel lateral fixo à direita (`w-[460px] h-full`), deslizando da direita com Framer Motion (`x: '100%' -> 0`).
    - **Mobile (`< 768px`):** _Bottom sheet_ ocupando `90vh` (ou tela cheia `inset-0`), fechável por botão `X` ou clique no backdrop.
- **Cabeçalho Fixo do Drawer:**
    - Breadcrumb da Ilha (ex: `Ilha T.A.C.O.`) + Nome do Totem.
    - Badge de status atual + tipo do checker.
    - Timestamp do último check convertido para horário local (`America/Sao_Paulo` / navegador).
    - **Botão "Force Check":** Dispara `POST /api/totems/:id/check`, exibe spinner enquanto processa e atualiza os dados via React Query / SSE (desabilitado durante a execução para evitar duplo clique).  Como o totem da VM funciona via **Push** (o script Bash da VM é quem envia os dados) e não via _Pull_, o botão **"Force Check"** deve ficar **oculto ou desabilitado** (com tooltip _"Atualizado automaticamente via heartbeat da VM"_) quando o totem aberto for do tipo `vm_heartbeat`.
- **Corpo Dinâmico por Tipo de Totem:**
    1. **Se `type === 'vm_heartbeat'`:**
        - **Bloco de Recursos:** 3 barras de progresso estilizadas (fonte `JetBrains Mono`) para **CPU Load (1m)**, **Memória RAM** (`1.45 GB / 4.00 GB — 36%`) e **Disco** (`48%`), mudando de cor automaticamente ao cruzar os thresholds (`>= 80%` âmbar, `>= 90%` vermelho).
        - **Lista de Containers Docker:** Cards compactos listando cada container (`n8n`, `portfolio-api`, etc.) com badge verde (`running`) ou vermelho (`exited` / `missing`).
    2. **Se `type === 'n8n_workflow'`:**
        - **Status do Workflow:** Pill indicando se está `Ativo` ou `Desativado no n8n`.
        - **Card de Consumo de Tokens LLM** _(renderizado apenas se o workflow possuir métricas de `tokenUsage`)_:
            - Total de tokens consumidos nas execuções carregadas, quebrado em `Prompt` e `Completion`.
        - **Histórico de Execuções (Paginado via `@tanstack/react-query`):**
            - Lista cronológica contendo: ícone de sucesso/erro, `executionId`, horário local, duração (`1.4s`), badge de tokens daquela execução (se houver) e caixa expansível/resumo com `errorMessage` caso tenha falhado.
    3. **Se `type === 'http_ping'` ou `'supabase_health'`:**
        - **Cards de Resumo:** Último Código HTTP (`200 OK`), Latência atual (`185 ms`) e status de conectividade.
        - **Histórico de Verificações (Paginado):** Lista cronológica de pings exibindo horário local, status HTTP, latência em `ms` e motivo do erro em caso de falha/timeout.
- **Estados Obrigatórios do Drawer:**
    - _Loading:_ Skeleton screens escuros com pulso sutil enquanto `@tanstack/react-query` busca `/totems/:id/logs`.
    - _Empty State:_ Mensagem limpa `"Nenhum registro de histórico encontrado nos últimos dias."`
    - _Error State:_ Card discreto com botão `"Tentar novamente"` caso a busca do histórico falhe.

## 7. Regras de Performance, Estado & Datas

- **Isolamento de Re-renders (RNF-08):** Envolver `<Island/>`, `<Totem/>` e `<ArcaneChain/>` com `React.memo`. Quando o stream SSE emitir uma atualização para um único `totemId`, atualizar apenas o nó correspondente no estado/cache do React Query sem recriar o array inteiro de posições das ilhas.
- **Sincronização SSE + React Query:**
    - Ao abrir o painel, `GET /api/islands` popula o estado inicial do arquipélago.
    - O hook `useAetherStream` (`@microsoft/fetch-event-source`) escuta eventos SSE (`totem.updated`) e atualiza diretamente o cache do `@tanstack/react-query` (`queryClient.setQueryData`).
    - Em caso de reconexão do SSE após queda de rede (RNF-03), invalidar `['islands']` para garantir sincronização completa de qualquer evento perdido durante o tempo offline.
- **Padronização de Datas (RNF-19):**
    - Utilizar `Intl.DateTimeFormat` / `Intl.RelativeTimeFormat` (nativo do JS, sem precisar instalar Moment.js) convertendo timestamps UTC ISO 8601 da API para o fuso do navegador.
    - Exibição padrão: tempo relativo (`há 3 min`) com data completa (`19/11/2026 22:05:12`) no atributo `title` ou subtítulo do Drawer.