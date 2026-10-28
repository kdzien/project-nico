"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "@lib/supabase/config";

export function browserSupabase() {
	const { url, key } = supabaseConfig();
	return createBrowserClient(url, key);
}
