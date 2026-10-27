"use client";

import { useI18n } from "@/lib/i18n/provider";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
	const { t } = useI18n();

	return (
		<main className="shell">
			<h1 className="error-title">{t("error.title")}</h1>
			<p className="lead">{t("error.description")}</p>
			<button onClick={reset}>{t("error.retry")}</button>
		</main>
	);
}
