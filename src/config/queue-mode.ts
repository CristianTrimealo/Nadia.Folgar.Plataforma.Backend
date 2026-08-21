import 'dotenv/config';

export function useRedisQueues(): boolean {
  const queueMode = process.env.QUEUE_MODE;

  if (queueMode === 'redis') return true;
  if (queueMode === 'inline') return false;

  return process.env.NODE_ENV === 'production';
}
