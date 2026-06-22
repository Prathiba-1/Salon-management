/**
 * Temporary generic Supabase `Database` type.
 *
 * This file replaces the placeholder that made every table type `never`,
 * which caused widespread TS errors during `tsc`. Replace with the
 * proper generated types from `supabase gen types` when available.
 */

export type Database = {
  public: {
    // Use permissive shapes so table/row types are not `never` during
    // type-checking. Each entry maps a table/view name to an open record.
    Tables: Record<string, Record<string, unknown>>
    Views: Record<string, Record<string, unknown>>
    Functions: Record<string, unknown>
    Enums: Record<string, string | number>
  }
}
