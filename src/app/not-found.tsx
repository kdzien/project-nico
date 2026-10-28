import Link from "next/link";
import { getI18n } from "@lib/i18n/server";

export default async function NotFound() {
	const { t } = await getI18n();

	return (
		<main className="shell">
			<p className="eyebrow">404</p>
			<h1 className="error-title">{t("error.notFoundTitle")}</h1>
			<p className="lead">{t("error.notFoundDescription")}</p>
			<Link className="button-link" href="/">
				{t("nav.events")}
			</Link>
		</main>
	);
}
