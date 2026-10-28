"use client";

import Link from "next/link";
import { logout } from "@app/login/actions";
import { useI18n } from "@lib/i18n/provider";

export function AppHeader() {
	const { t } = useI18n();

	return (
		<header className="topbar">
			<Link href="/" className="brand">
				NICO
			</Link>
			<nav aria-label={t("nav.main")}>
				<Link href="/">{t("nav.events")}</Link>
				<Link href="/coupons">{t("nav.coupons")}</Link>
				<Link href="/settings">{t("nav.settings")}</Link>
				<form action={logout}>
					<button className="secondary">{t("nav.logout")}</button>
				</form>
			</nav>
		</header>
	);
}
