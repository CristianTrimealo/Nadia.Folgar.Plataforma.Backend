import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().min(1).default('api/v1'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI es requerida'),
  REDIS_URL: z.string().optional(),
  QUEUE_MODE: z.enum(['inline', 'redis']).default('inline'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET debe tener al menos 16 caracteres'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  THROTTLE_TTL: z.coerce.number().int().positive().default(60000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(20),

  /**
   * Selección del adapter de IA para extractos-ia (`AiExtractionPort`).
   * 'stub' (default) no requiere credenciales — así los tests y el desarrollo
   * local no dependen de una API key real. 'anthropic' usa Claude Sonnet 5,
   * 'openai' usa GPT-5.1.
   */
  AI_PROVIDER: z.enum(['stub', 'anthropic', 'openai']).default('stub'),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-5.1'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema
    .superRefine((data, ctx) => {
      if (data.AI_PROVIDER === 'anthropic' && !data.ANTHROPIC_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ANTHROPIC_API_KEY'],
          message: 'ANTHROPIC_API_KEY es requerida cuando AI_PROVIDER=anthropic',
        });
      }
      if (data.AI_PROVIDER === 'openai' && !data.OPENAI_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['OPENAI_API_KEY'],
          message: 'OPENAI_API_KEY es requerida cuando AI_PROVIDER=openai',
        });
      }
      if (data.QUEUE_MODE === 'redis' && !data.REDIS_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['REDIS_URL'],
          message: 'REDIS_URL es requerida cuando QUEUE_MODE=redis',
        });
      }
    })
    .safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuración de entorno inválida. Revisá tu .env:\n${issues}`);
  }

  return result.data;
}
