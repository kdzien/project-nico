"use client";

import { useI18n } from "@lib/i18n/provider";
import type { ResultState } from "@lib/result-status";

export function ResultIcon({ state }: { state: ResultState }) {
	const { t, statusLabel } = useI18n();
	const provisional = state.startsWith("live-");
	const outcome = provisional ? state.slice(5) : state;
	const label =
		state === "live-won"
			? t("coupon.provisionalWon")
			: state === "live-lost"
				? t("coupon.provisionalLost")
				: statusLabel(state);
	return (
		<span
			className={`result-symbol result-symbol-${outcome}${provisional ? " result-symbol-provisional" : ""}`}
			role="img"
			aria-label={label}
			title={label}
		>
			<svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
				<circle className="result-symbol-ring" cx="12" cy="12" r="9.5" />
				{outcome === "won" && <path d="m7.5 12 3 3 6-6" />}
				{outcome === "lost" && <path d="m9 9 6 6m0-6-6 6" />}
				{outcome === "pending" && <path d="M12 7.5V12l3 1.5" />}
				{outcome === "void" && <path d="M8 12h8" />}
			</svg>
		</span>
	);
}

export function EditIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="m14.5 5.5 4 4M4 20l4.5-1 12-12a2.8 2.8 0 0 0-4-4l-12 12L4 20Z" />
		</svg>
	);
}
export function TrashIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5" />
		</svg>
	);
}
