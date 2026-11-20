import { extractTokenUsageFromRunData } from './n8n-token-parser';

describe('extractTokenUsageFromRunData', () => {
  it('soma múltiplas ocorrências nos formatos LangChain, OpenAI e Gemini', () => {
    const runData = {
      'AI Agent': [
        {
          data: {
            ai_languageModel: [
              [
                {
                  json: {
                    tokenUsage: {
                      promptTokens: 100,
                      completionTokens: 40,
                      totalTokens: 140,
                    },
                  },
                },
              ],
            ],
          },
        },
      ],
      'Groq Node': [
        {
          json: {
            usage: {
              prompt_tokens: 200,
              completion_tokens: 50,
              total_tokens: 250,
            },
          },
        },
      ],
      'Gemini Node': [
        {
          json: {
            usageMetadata: {
              promptTokenCount: 300,
              candidatesTokenCount: 60,
              totalTokenCount: 360,
            },
          },
        },
      ],
    };

    expect(extractTokenUsageFromRunData(runData)).toEqual({
      promptTokens: 600,
      completionTokens: 150,
      totalTokens: 750,
    });
  });

  it('retorna null quando não há uso de tokens LLM', () => {
    const runData = {
      Webhook: [{ json: { ok: true, count: 3 } }],
    };

    expect(extractTokenUsageFromRunData(runData)).toBeNull();
    expect(extractTokenUsageFromRunData(null)).toBeNull();
  });

  it('calcula totalTokens quando omitido pelo provedor', () => {
    const runData = {
      Node: {
        tokenUsage: {
          promptTokens: 120,
          completionTokens: 30,
        },
      },
    };

    expect(extractTokenUsageFromRunData(runData)).toEqual({
      promptTokens: 120,
      completionTokens: 30,
      totalTokens: 150,
    });
  });

  it('lida com referências circulares sem loop infinito', () => {
    const circular: Record<string, unknown> = {
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };
    circular.self = circular;

    expect(extractTokenUsageFromRunData(circular)).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });
  });
});
