import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { createI18n, type Preferences } from "./index";

export const getPreferences = cache(async (): Promise<Preferences> => {
	const store = await cookies();
	return {
		locale: store.get("nico-locale")?.value === "en" ? "en" : "pl",
		theme: store.get("nico-theme")?.value === "light" ? "light" : "dark",
	};
});

export async function getI18n() {
	const { locale } = await getPreferences();
	return createI18n(locale);
}
