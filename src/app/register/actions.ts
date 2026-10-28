"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { MessageKey } from "@lib/i18n";
import { serverSupabase } from "@lib/supabase/server";

const registrationSchema = z
	.object({
		email: z.string().trim().pipe(z.email()),
		password: z.string().min(8).max(128),
		passwordConfirmation: z.string(),
	})
	.refine((input) => input.password === input.passwordConfirmation);

export async function register(
	_previous: MessageKey | "",
	form: FormData,
): Promise<MessageKey | ""> {
	const parsed = registrationSchema.safeParse({
		email: form.get("email"),
		password: form.get("password"),
		passwordConfirmation: form.get("passwordConfirmation"),
	});

	if (!parsed.success) {
		return "register.invalid";
	}

	const db = await serverSupabase();
	const origin = (await headers()).get("origin");
	const { data, error } = await db.auth.signUp({
		email: parsed.data.email,
		password: parsed.data.password,
		...(origin ? { options: { emailRedirectTo: new URL("/auth/callback", origin).href } } : {}),
	});

	if (error) {
		if (["user_already_exists", "email_exists"].includes(error.code ?? "")) {
			return "register.emailUsed";
		}
		if (["over_request_rate_limit", "over_email_send_rate_limit"].includes(error.code ?? "")) {
			return "register.rateLimited";
		}
		return "register.failed";
	}

	if (!data.session) {
		return "register.confirmEmail";
	}

	redirect("/");
}
