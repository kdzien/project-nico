import Link from "next/link";
import { getI18n } from "@lib/i18n/server";
import { redirect } from "next/navigation";
import { serverSupabase } from "@lib/supabase/server";
import { LoginForm } from "@app/login/form";

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ confirmation?: string }>;
}) {
	const { t } = await getI18n();
	const db = await serverSupabase();
	const { data } = await db.auth.getUser();
	if (data.user) {
		redirect("/");
	}
	const { confirmation } = await searchParams;
	return (
		<main className="shell login">
			<p className="eyebrow">NICO</p>
			<h1>{t("login.title")}</h1>
			{confirmation === "failed" && (
				<p role="alert" className="notice">
					{t("register.confirmationFailed")}
				</p>
			)}
			<LoginForm />
			<p className="muted">
				{t("login.noAccount")}{" "}
				<Link className="inline-link" href="/register">
					{t("register.submit")}
				</Link>
			</p>
		</main>
	);
}
