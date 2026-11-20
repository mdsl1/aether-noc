# Stack & Infraestrutura

## Front-end

### Local de Hospedagem: Vercel
> **Justificativa:** A mesma lida melhor com projetos SPA (single page application) do que o Github Pages
### Dependências:
#### Core & Build:
- React.js (v19) + Typescript
- Vite
#### Estilização & UI:
- TailwindCSS
- Lucide React: Icones do projeto
- clsx + tailwind-merge: Gerenciamento limpo de classes condicionais por estado do totem (healthy, warning, critical)
#### Animações & Interatividade do Arquipélago:
- Framer Motion: Opcional, mas excelente para a flutuação suave das ilhas, transições do Drawer lateral e pulso dos totens sem pesar
- react-zoom-pan-pinch: Permite arrastar e dar zoom no céu conforme o número de ilhas crescer com novos projetos
#### Comunicação & Estado:
- @microsoft/fetch-event-source: Substitui o `EventSource` nativo para conectar no SSE enviando o header `Authorization: Bearer <token>` de forma segura
- @tanstack/react-query: Cache e paginação do histórico de execuções ao clicar em cada totem
- Axios/ Fetch nativo: Requisições REST para login e ações manuais como _Force Check_

## Back-end
### Local de Hospedagem: Render
>**Justificativa:** Isolar o "monitorador" da infraestrutura que ele vigia é uma prática comum para evitar o "ponto único de falha (SPOF)"
### Dependências:
#### Core & Arquitetura:
- Node.js (v22+LTS) + NestJS + Typescript,
- @nestjs/config: Validação e tipagem rigorosa das variáveis de ambiente do .env
- CORS: Como o front e backend estarão hospedados em domínios diferentes, será necessário o app.enableCors() e liberar os headers Authorization e x-api-key
- Trust Proxy: Para o throttler não bloquear todos que consumirem a API achando que tudo vem do mesmo IP, é preciso definir `app.set('trust proxy', 1)` no `main.ts`
#### Segurança & Rate Limiting (Token Bucket):
- @nestjs/throttler: Implementação nativa de _Token Bucket_ / Rate Limiting para proteger rotas de login e endpoints de telemetria
- @nestjs/jwt + passport + passport-jwt: autenticação do painel via JWT
- bcrypt: comparação segura de hashes
- helmet: proteção básica de headers HTTP
#### Agendamento & Comunicação:
- @nestjs/schedule: Execução dos Crons periódicos pra pingar APIs, consultar n8n e verificar health da VM
- @nestjs/event-emitter: desacopla a coleta de dados de emissão SSE - quando um checker detecta mudança de estado, dispara um evento interno que é transmitido ao front-end
- @nestjs/axios: Chamadas HTTP externas para API REST do n8n, healthchecks de sites/ APIs e disparos de telegram
#### Validação de contratos (Essencial para o SDD):
- class-validator + class-transformer: Garante que DTOs de entrada da telemetria e configuração das ilhas siga estritamente a especificação
#### Conexão com Banco de Dados MongoDB:
- mongoose + @nestjs/mongoose: Modelagem do schemas de islands, totem_logs e totem_states

## Banco de Dados
### Local de Hospedagem: MongoDB Atlas
>**Justificativa:** Além de ter um plano free, um banco NoSQL é perfeito pra esse projeto
### Recursos Nativos:
- TTL Indexes (Time-To-Live): Para expirar automaticamente documentos na coleção totem_logs para manter o banco sempre leve
- Compound Indexes: Indices compostos em { totemId: 1, timestamp: -1 } para carregamento instantaneo do Drawer de histórico
>Importante: Vamos utilizar um container MongoDB local para testes, para não poluir o banco real

## Integrações Externas & Infraestrutura Auxiliar

> Essas integrações servirão para conectar o A.E.T.H.E.R. ao mundo real, e a infraestrutura auxiliar manterá o monitoramento vivo fora da VM. Para mais informações vide [[Detalhes das Integrações]]
#### API REST do n8n:
Consumirá os endpoints:
- [GET] /api/v1/workflows
- [GET] /api/v1/executions?includeData=true
#### Telegram Bot API:
Enviará os alertas críticos via HTTP:
- [POST] /api.telegram.org/bot{token}/sendMessage
> !Importante: Essa integração deverá ter uma regra de cooldown anti-spam
#### Heartbeat VM:
Script bash + Crontab Linux enviando informações da VM via HTTP:
- [POST] /api-render/telemetry/heartbeat
#### Keep-Alive pro Render: 
- Cronjob Externo batendo na rota /health a cada 5min para impedir o cold start do plano gratuito do Render
### Ferramentas de Desenvolvimento & Qualidade
> Servirão para garantir que o agente de IA siga as especificações à risca durante o pair programming
#### Testes:
- Jest + Supertest: Já integrados ao nestjs, serão usados para realizar os testes
#### Documentação de Contratos:
- @nestjs/swagger: Gera automaticamente a especificação OpenAPI a partir dos DTOs
#### Padronização:
- ESLint + Prettier + Conventional Commits
#### Containerização:
- Vamos utilizar docker na etapa de desenvolvimento para facilitar os processos, porém para subir em produção não utilizaremos containers (Tanto a Vercel quanto o Render já fazem o deploy nativamente)
