import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getI18n, getPreferences } from "@lib/i18n/server";
import { PreferencesProvider } from "@lib/i18n/provider";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
	const { t } = await getI18n();
	return { title: "Nico", description: t("app.description") };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
	const preferences = await getPreferences();

	return (
		<html lang={preferences.locale} data-theme={preferences.theme}>
			<body>
				<PreferencesProvider preferences={preferences}>{children}</PreferencesProvider>
			</body>
		</html>
	);
}
