# A.E.T.H.E.R.

Painel de observabilidade pessoal em estética Dark Fantasy Pixel Art, dividido em `api/` (NestJS + Mongoose) e `web/` (React + Vite).

---

## Guia de Comandos

### 1. Infraestrutura Local (MongoDB via Docker)

Execute a partir da **raiz do repositório** (porta local exposta em `127.0.0.1:27018`):

| Comando | O que faz |
| --- | --- |
| `docker compose up -d` | Sobe o container do MongoDB 7 local (`aether-mongodb`) em background para testes automatizados e `seed:local`. |
| `docker compose down` | Para e remove o container local mantendo o volume de dados (`aether_mongo_data`). |
| `docker compose down -v` | Para o container e apaga também o volume de dados local (reset completo da base de testes). |
| `docker compose logs -f mongodb` | Acompanha os logs do container MongoDB em tempo real. |

---

### 2. Back-end (`api/`)

Execute os comandos abaixo dentro da pasta `api/` (`cd api`):

#### Desenvolvimento & Build

| Comando | O que faz |
| --- | --- |
| `npm install` | Instala todas as dependências do back-end. |
| `npm run start:dev` | Inicia a API em modo desenvolvimento com hot-reload (conecta ao MongoDB Atlas via `MONGO_URI`). Swagger fica disponível em `/api/docs` e healthcheck em `/health`. |
| `npm run start` | Inicia a API em modo padrão sem watch. |
| `npm run start:debug` | Inicia a API em modo watch com inspector de debug habilitado. |
| `npm run build` | Compila o projeto TypeScript para a pasta `dist/`. |
| `npm run start:prod` | Executa a versão compilada de produção (`node dist/main`). |

#### Seed do Banco de Dados (Idempotente)

| Comando | O que faz |
| --- | --- |
| `npm run seed` | Sincroniza os índices e faz `upsert` das 4 ilhas, 12 totens e estados iniciais no **MongoDB Atlas** (`MONGO_URI`) sem duplicar dados nem sobrescrever telemetria existente. |
| `npm run seed:local` | Executa o mesmo seed idempotente no **MongoDB local (Docker)** via `MONGO_TEST_URI`, com trava obrigatória validando que a URI aponta exclusivamente para `localhost` ou `127.0.0.1`. |

#### Qualidade, Tipagem & Testes

| Comando | O que faz |
| --- | --- |
| `npx tsc --noEmit` | Executa verificação estrita de tipos TypeScript (`strict: true`) sem gerar arquivos. |
| `npm run lint` | Executa o ESLint com auto-fix nos arquivos de `src/` e `test/`. |
| `npm run format` | Formata os arquivos TypeScript de `src/` e `test/` com Prettier. |
| `npm test` | Roda a suíte de testes unitários com Jest. |
| `npm run test:watch` | Roda os testes unitários em modo watch. |
| `npm run test:cov` | Roda os testes unitários gerando relatório de cobertura em `coverage/`. |
| `npm run test:e2e` | Roda a suíte de testes ponta a ponta (Supertest) usando `test/jest-e2e.json`. |

#### Utilitários

| Comando | O que faz |
| --- | --- |
| `node hash-password.js` | _(Script temporário)_ Solicita uma senha no terminal (sem salvar no histórico) e imprime a linha `ADMIN_PASSWORD_HASH='...'` já formatada com aspas simples para colar no `api/.env`. |
| `node -e "const b=require('bcrypt'); b.hash('SUA_SENHA',10).then(h=>console.log(\`ADMIN_PASSWORD_HASH='\${h}'\`))"` | Alternativa inline caso o script temporário `hash-password.js` já tenha sido removido. |
