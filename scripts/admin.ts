import "./env.js";
import { createClient } from "@supabase/supabase-js";

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Brak konfiguracji Supabase.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
