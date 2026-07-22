const REQUIRED_PUBLIC_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
] as const;

export type SupabasePublicEnvName = (typeof REQUIRED_PUBLIC_ENV)[number];

export function getSupabasePublicConfig() {
  const values = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };

  const missing = REQUIRED_PUBLIC_ENV.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Thiếu cấu hình Supabase: ${missing.join(', ')}. Hãy khai báo trong Vercel hoặc .env.local.`
    );
  }

  return {
    url: values.url as string,
    publishableKey: values.publishableKey as string,
  };
}

export function isSupabaseConfigured() {
  return REQUIRED_PUBLIC_ENV.every((name) => Boolean(process.env[name]));
}
