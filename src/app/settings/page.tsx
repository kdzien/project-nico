import { AppHeader } from "@components/app-header";
import { getI18n } from "@lib/i18n/server";
import { requireUser } from "@lib/supabase/server";
import { SettingsForm } from "@app/settings/form";

export default async function SettingsPage() {
	await requireUser();
	const { t } = await getI18n();

	return (
		<main className="shell app-shell">
			<AppHeader />
			<section className="page-heading">
				<div>
					<h1>{t("settings.title")}</h1>
				</div>
			</section>
			<SettingsForm />
		</main>
	);
}
