export function parseCorsOrigins(raw: string, nodeEnv: string): string[] | boolean {
  const origins = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    return nodeEnv === 'development';
  }

  return origins;
}
