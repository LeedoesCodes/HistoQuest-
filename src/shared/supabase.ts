import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client. Reads config from Vite env vars so you can develop
 * against your OWN throwaway project now, then swap to the team's shared
 * project at merge time by changing .env.local only (no code changes).
 *
 * Create a `.env.local` (see .env.example). If the vars are missing, the
 * app runs in OFFLINE-MOCK mode (see logger.ts) so you are never blocked
 * waiting on a backend.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anonKey!)
  : null;
