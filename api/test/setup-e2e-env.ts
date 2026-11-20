import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { assertLocalMongoUri } from '../src/common/utils/mongo-uri.utils';

export const E2E_ADMIN_USERNAME = 'aether-e2e-admin';
export const E2E_ADMIN_PASSWORD = 'e2e-strong-password-123';
export const E2E_INGEST_API_KEY = 'e2e-ingest-api-key-123456';

const localUri = assertLocalMongoUri(process.env.MONGO_TEST_URI);

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = localUri;
process.env.MONGO_TEST_URI = localUri;
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.ADMIN_USERNAME = E2E_ADMIN_USERNAME;
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync(E2E_ADMIN_PASSWORD, 4);
process.env.JWT_SECRET = 'e2e-jwt-secret-key-with-at-least-32-chars';
process.env.JWT_EXPIRES_IN = '1h';
process.env.INGEST_API_KEY = E2E_INGEST_API_KEY;
process.env.N8N_BASE_URL = 'https://n8n.test.local';
process.env.N8N_API_KEY = 'e2e-n8n-key';
process.env.SUPABASE_PORTFOLIO_URL = 'https://portfolio.supabase.local';
process.env.SUPABASE_PORTFOLIO_SERVICE_ROLE_KEY =
  'e2e-supabase-portfolio-service-role-key';
process.env.SUPABASE_N8N_URL = 'https://n8n.supabase.local';
process.env.SUPABASE_N8N_SERVICE_ROLE_KEY = 'e2e-supabase-n8n-service-role-key';
process.env.TELEGRAM_BOT_TOKEN = '123456:e2e-telegram-token';
process.env.TELEGRAM_CHAT_ID = '999999999';
