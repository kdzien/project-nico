"use server";
import type { MessageKey } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { serverSupabase } from "@/lib/supabase/server";

export async function login(_previous: MessageKey | "", form: FormData): Promise<MessageKey | ""> {
	const input = z.object({ email: z.email(), password: z.string().min(1) }).safeParse({
		email: form.get("email"),
		password: form.get("password"),
	});
	if (!input.success) {
		return "login.invalid";
	}
	const db = await serverSupabase();
	const { error } = await db.auth.signInWithPassword(input.data);
	if (error) {
		return "login.failed";
	}
	redirect("/");
}

export async function logout() {
	const db = await serverSupabase();
	const { error } = await db.auth.signOut();
	if (error) {
		const { t } = await getI18n();
		throw new Error(t("login.logoutFailed"));
	}
	redirect("/login");
}
