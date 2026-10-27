"use client";

import { useI18n } from "@/lib/i18n/provider";

export default function Loading() {
	const { t } = useI18n();

	return (
		<main className="shell">
			<p role="status" className="lead">
				{t("app.loading")}
			</p>
		</main>
	);
}
