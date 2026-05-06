import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let _sql: NeonQueryFunction<false, false> | null = null

export function getDb(): NeonQueryFunction<false, false> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql
}

// Convenience proxy — behaves like the tagged-template sql`` but initialises lazily
export const sql: NeonQueryFunction<false, false> = new Proxy(
  {} as NeonQueryFunction<false, false>,
  {
    apply(_target, _thisArg, args) {
      return (getDb() as unknown as (...a: unknown[]) => unknown)(...args)
    },
    get(_target, prop) {
      return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
    },
  }
)
