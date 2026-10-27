import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseConfig } from "./config";

export async function serverSupabase() {
	const store = await cookies();
	const { url, key } = supabaseConfig();
	return createServerClient(url, key, {
		cookies: {
			getAll: () => store.getAll(),
			setAll(values) {
				try {
					values.forEach(({ name, value, options }) => store.set(name, value, options));
				} catch {
					// Server Components are read-only; proxy persists refreshed cookies.
				}
			},
		},
	});
}

export async function requireUser() {
	const db = await serverSupabase();
	const { data, error } = await db.auth.getUser();
	if (error || !data.user) {
		redirect("/login");
	}
	return { db, user: data.user };
}
