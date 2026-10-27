"use client";
import { useI18n } from "@/lib/i18n/provider";
import { useActionState, useState } from "react";
import Link from "next/link";
import { saveCoupon, type SaveState } from "@/app/coupons/actions";
import { combinedOdds } from "@/lib/coupons";
import type { Coupon, DraftItem } from "@/lib/models";

export function CouponEditor({
	items,
	remove,
	coupon,
}: {
	items: DraftItem[];
	remove: (id: string) => void;
	coupon: Coupon | null;
}) {
	const { t, formatNumber } = useI18n();
	const [state, action, pending] = useActionState<SaveState, FormData>(saveCoupon, {
		message: "",
		id: coupon?.id ?? null,
		ok: false,
	});
	const [name, setName] = useState(coupon?.name ?? t("coupon.defaultName"));
	const [stake, setStake] = useState(coupon?.stake?.toString() ?? "");
	const combined = combinedOdds(items);
	return (
		<aside className="coupon-editor">
			<p className="eyebrow">{t("coupon.eyebrow")}</p>
			<h2>{t(coupon ? "coupon.editDraft" : "coupon.title")}</h2>
			<p className="muted">{t("coupon.count", { count: items.length })}</p>
			{!items.length && <p className="muted">{t("coupon.empty")}</p>}
			<ol className="draft-items">
				{items.map((item) => (
					<li key={item.event_id}>
						<strong>
							{item.event.home_team} – {item.event.away_team}
						</strong>
						<div className="draft-line">
							<span>
								{t("coupon.selection", {
									selection: item.selection,
									odds: formatNumber(item.odds_at_add),
								})}
							</span>
							<button
								type="button"
								className="text-button"
								aria-label={t("coupon.removeLabel", {
									home: item.event.home_team,
									away: item.event.away_team,
								})}
								onClick={() => remove(item.event_id)}
								disabled={pending}
							>
								{t("common.remove")}
							</button>
						</div>
					</li>
				))}
			</ol>
			<div className="combined">
				<span>{t("coupon.combined")}</span>
				<strong>{formatNumber(combined)}</strong>
			</div>
			<form action={action} className="stack">
				<input
					type="hidden"
					name="items"
					value={JSON.stringify(
						items.map(({ event_id, selection, odds_at_add }) => ({
							event_id,
							selection,
							odds_at_add,
						})),
					)}
				/>
				<input type="hidden" name="id" value={state.id ?? ""} />
				<label>
					{t("coupon.name")}
					<input
						name="name"
						required
						maxLength={120}
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</label>
				<label>
					{t("coupon.stake")}
					<input
						type="number"
						name="stake"
						min="0"
						max="9999999999.99"
						step="0.01"
						value={stake}
						onChange={(e) => setStake(e.target.value)}
					/>
				</label>
				{state.message && (
					<p role="status" className={state.ok ? "success" : "notice"}>
						{t(state.message)}
					</p>
				)}
				<button
					name="intent"
					value="draft"
					disabled={
						pending || !items.length || !Number.isFinite(combined) || combined >= 1e10
					}
				>
					{t(pending ? "common.saving" : "coupon.saveDraft")}
				</button>
				<button
					name="intent"
					value="finalize"
					className="secondary"
					disabled={
						pending || !items.length || !Number.isFinite(combined) || combined >= 1e10
					}
				>
					{t("coupon.finalize")}
				</button>
			</form>
			<p className="muted small">{t("coupon.explanation")}</p>
			<Link className="inline-link" href="/coupons">
				{t("coupon.viewAll")}
			</Link>
		</aside>
	);
}
