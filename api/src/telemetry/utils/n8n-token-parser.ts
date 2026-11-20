import { TokenUsage } from '../../common/types/domain.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNonNegativeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }
  return null;
}

function extractFromTokenObject(
  obj: Record<string, unknown>,
  promptKey: string,
  completionKey: string,
  totalKey: string,
): TokenUsage | null {
  const prompt = asNonNegativeNumber(obj[promptKey]);
  const completion = asNonNegativeNumber(obj[completionKey]);
  const total = asNonNegativeNumber(obj[totalKey]);

  if (prompt === null && completion === null && total === null) {
    return null;
  }

  const promptTokens = prompt ?? 0;
  const completionTokens = completion ?? 0;
  const totalTokens = total ?? promptTokens + completionTokens;

  return { promptTokens, completionTokens, totalTokens };
}

/**
 * Varre recursivamente `data.resultData.runData` de uma execução do n8n
 * somando todas as ocorrências de consumo de tokens LLM nos formatos:
 * - LangChain / n8n AI Nodes: `tokenUsage.{promptTokens, completionTokens, totalTokens}`
 * - OpenAI / Groq: `usage.{prompt_tokens, completion_tokens, total_tokens}`
 * - Gemini: `usageMetadata.{promptTokenCount, candidatesTokenCount, totalTokenCount}`
 */
export function extractTokenUsageFromRunData(
  runData: unknown,
): TokenUsage | null {
  if (!isRecord(runData) && !Array.isArray(runData)) {
    return null;
  }

  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let foundAny = false;

  const visited = new WeakSet<object>();

  const accumulate = (usage: TokenUsage): void => {
    promptTokens += usage.promptTokens;
    completionTokens += usage.completionTokens;
    totalTokens += usage.totalTokens;
    foundAny = true;
  };

  const walk = (node: unknown): void => {
    if (node === null || typeof node !== 'object') {
      return;
    }

    if (visited.has(node)) {
      return;
    }
    visited.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item);
      }
      return;
    }

    const record = node as Record<string, unknown>;

    for (const [key, value] of Object.entries(record)) {
      if (key === 'tokenUsage' && isRecord(value)) {
        const parsed = extractFromTokenObject(
          value,
          'promptTokens',
          'completionTokens',
          'totalTokens',
        );
        if (parsed) {
          accumulate(parsed);
          continue;
        }
      }

      if (key === 'usage' && isRecord(value)) {
        const parsed = extractFromTokenObject(
          value,
          'prompt_tokens',
          'completion_tokens',
          'total_tokens',
        );
        if (parsed) {
          accumulate(parsed);
          continue;
        }
      }

      if (key === 'usageMetadata' && isRecord(value)) {
        const parsed = extractFromTokenObject(
          value,
          'promptTokenCount',
          'candidatesTokenCount',
          'totalTokenCount',
        );
        if (parsed) {
          accumulate(parsed);
          continue;
        }
      }

      walk(value);
    }
  };

  walk(runData);

  if (!foundAny) {
    return null;
  }

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
}
