"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@lib/supabase/server";
import type { MessageKey } from "@lib/i18n";

const preferencesSchema = z.object({
	locale: z.enum(["pl", "en"]),
	theme: z.enum(["light", "dark"]),
});

export async function savePreferences(
	_previous: MessageKey | "",
	form: FormData,
): Promise<MessageKey | ""> {
	await requireUser();
	const parsed = preferencesSchema.safeParse({
		locale: form.get("locale"),
		theme: form.get("theme"),
	});

	if (!parsed.success) {
		return "settings.invalid";
	}

	const store = await cookies();
	const options = {
		httpOnly: true,
		sameSite: "lax" as const,
		secure: process.env.NODE_ENV === "production",
		maxAge: 60 * 60 * 24 * 365,
		path: "/",
	};

	store.set("nico-locale", parsed.data.locale, options);
	store.set("nico-theme", parsed.data.theme, options);
	revalidatePath("/", "layout");

	return "settings.saved";
}
