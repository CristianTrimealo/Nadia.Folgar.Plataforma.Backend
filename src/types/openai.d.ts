declare module 'openai' {
  export default class OpenAI {
    constructor(options: { apiKey?: string });

    chat: {
      completions: {
        parse(options: unknown): Promise<{
          choices: Array<{
            finish_reason?: string;
            message?: {
              refusal?: unknown;
              parsed?: unknown;
            };
          }>;
        }>;
        create(options: unknown): Promise<{
          choices: Array<{
            message?: {
              content?: string | null;
            };
          }>;
        }>;
      };
    };

    models: {
      list(options?: unknown): Promise<unknown>;
    };
  }
}

declare module 'openai/helpers/zod' {
  export function zodResponseFormat(schema: unknown, name: string): unknown;
}
