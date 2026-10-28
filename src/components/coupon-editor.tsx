"use client";

import { useEffect, useRef, useState } from "react";
import { clearCoupon, deleteCoupon, saveCoupon } from "@app/coupons/actions";
import { combinedOdds } from "@lib/coupons";
import type { MessageKey } from "@lib/i18n";
import { useI18n } from "@lib/i18n/provider";
import type { CouponDraft } from "@lib/models";

export function CouponEditor({
	draft,
	active,
	activate,
	remove,
	setStake,
	canDelete,
	onDeleted,
	onCleared,
	onBusy,
	actionsDisabled,
	asOf,
}: {
	draft: CouponDraft;
	active: boolean;
	activate: () => void;
	remove: (id: string) => void;
	setStake: (value: string) => void;
	canDelete: boolean;
	onDeleted: () => void;
	onCleared: () => void;
	onBusy: (busy: boolean) => void;
	actionsDisabled: boolean;
	asOf: number;
}) {
	const { t, formatNumber, formatCurrency } = useI18n();
	const savedId = useRef(draft.id);
	const queue = useRef(Promise.resolve());
	const [error, setError] = useState<MessageKey | "">("");
	const [retry, setRetry] = useState(0);
	const [busy, setBusy] = useState(false);
	const operation = useRef(false);
	const failedOperation = useRef<"clear" | "delete" | null>(null);
	const combined = combinedOdds(draft.items);
	const stake = draft.stake === "" ? null : Number(draft.stake.replace(",", "."));
	const validStake =
		stake === null || (Number.isFinite(stake) && stake >= 0 && stake <= 9999999999.99);
	const validCombined = Number.isFinite(combined) && combined < 1e10;

	useEffect(() => {
		if (busy || !draft.revision || !validStake || !validCombined) {
			return;
		}
		let current = true;
		const timer = setTimeout(
			() => {
				if (operation.current) {
					return;
				}
				queue.current = queue.current.then(async () => {
					try {
						const result = await saveCoupon({
							id: savedId.current,
							name: draft.name,
							stake,
							items: draft.items.map(({ event_id, selection, odds_at_add }) => ({
								event_id,
								selection,
								odds_at_add,
							})),
						});
						if (result.id) {
							savedId.current = result.id;
						}
						if (current) {
							setError(result.message);
						}
					} catch {
						if (current) {
							setError("coupon.saveFailed");
						}
					}
				});
			},
			draft.change === "stake" ? 400 : 0,
		);
		return () => {
			current = false;
			clearTimeout(timer);
		};
	}, [draft, stake, validStake, validCombined, retry, busy]);

	function mutate(kind: "clear" | "delete") {
		if (operation.current || actionsDisabled || (kind === "delete" && !canDelete)) {
			return;
		}
		operation.current = true;
		failedOperation.current = null;
		setBusy(true);
		onBusy(true);
		queue.current = queue.current.then(async () => {
			try {
				let message: MessageKey | "" = "";
				if (savedId.current) {
					if (kind === "clear") {
						message = await clearCoupon(savedId.current);
					} else {
						const form = new FormData();
						form.set("id", savedId.current);
						const result = await deleteCoupon("", form);
						message = result === "coupon.deleted" ? "" : result;
					}
				}
				failedOperation.current = message ? kind : null;
				setError(message);
				if (!message) {
					if (kind === "clear") {
						onCleared();
					} else {
						onDeleted();
					}
				}
			} catch {
				failedOperation.current = kind;
				setError(kind === "clear" ? "coupon.clearFailed" : "coupon.deleteFailed");
			} finally {
				operation.current = false;
				setBusy(false);
				onBusy(false);
			}
		});
	}

	return (
		<article className={`coupon-editor${active ? " coupon-active" : ""}`} onClick={activate}>
			<button type="button" className="sr-only" aria-pressed={active} onClick={activate}>
				{t("coupon.title")}
			</button>
			{!draft.items.length && <p className="muted small">{t("coupon.empty")}</p>}
			<ol className="draft-items">
				{draft.items.map((item) => (
					<li key={item.event_id}>
						<div className="draft-match">
							<span>
								{item.event.home_team} – {item.event.away_team}
							</span>
							<button
								type="button"
								className="filter-remove"
								aria-label={t("coupon.removeLabel", {
									home: item.event.home_team,
									away: item.event.away_team,
								})}
								disabled={
									busy ||
									item.event.status !== "scheduled" ||
									Date.parse(item.event.kickoff) <= asOf
								}
								onClick={() => remove(item.event_id)}
							>
								×
							</button>
						</div>
						<div className="draft-line">
							<span>{item.selection}</span>
							<span>{formatNumber(item.odds_at_add)}</span>
						</div>
					</li>
				))}
			</ol>
			<div className="coupon-summary">
				<div className="draft-line">
					<span>{t("coupon.combined")}</span>
					<span>{draft.items.length ? formatNumber(combined) : "—"}</span>
				</div>
				<label className="coupon-stake">
					<span>{t("coupons.stake")}</span>
					<input
						type="text"
						inputMode="decimal"
						value={draft.stake}
						disabled={busy}
						aria-invalid={!validStake}
						onChange={(event) => setStake(event.target.value)}
					/>
				</label>
				<div className="draft-line">
					<span>{t("coupon.potentialWin")}</span>
					<span>
						{draft.items.length && validStake && stake !== null && validCombined
							? formatCurrency(stake * combined)
							: "—"}
					</span>
				</div>
			</div>
			<div className="coupon-tools">
				<button
					type="button"
					className="text-button"
					disabled={actionsDisabled || !draft.items.length}
					onClick={() => mutate("clear")}
				>
					{t("coupon.clear")}
				</button>
				{canDelete && (
					<button
						type="button"
						className="text-button"
						disabled={actionsDisabled}
						onClick={() => mutate("delete")}
					>
						{t("coupon.delete")}
					</button>
				)}
			</div>
			{(!validStake || !validCombined || error) && (
				<p className="notice small" role="alert">
					{t(
						!validStake || !validCombined
							? "coupon.invalidInput"
							: error || "coupon.invalidInput",
					)}
					{error && (
						<button
							type="button"
							className="text-button"
							disabled={actionsDisabled}
							onClick={() => {
								if (failedOperation.current) {
									mutate(failedOperation.current);
								} else {
									setRetry((value) => value + 1);
								}
							}}
						>
							{t("error.retry")}
						</button>
					)}
				</p>
			)}
		</article>
	);
}
