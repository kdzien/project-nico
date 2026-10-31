"use client";
import { useResultsPolling } from "@components/live-results";
import { mergeEventResult, type EventResult } from "@lib/live-results";
import { useI18n } from "@lib/i18n/provider";
import { useCallback, useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { combinedOdds, potentialWinnings } from "@lib/coupons";
import { compareCompetitions, competitionKey } from "@lib/competitions";
import { validDate } from "@lib/dates";
import {
	matchesOddsFilters,
	parseOddsRule,
	type OddsFilterRule,
	type OddsFilterMode,
} from "@lib/odds-filters";
import { OddsFilters } from "@components/odds-filters";
import { type Coupon, type CouponDraft, type DraftItem, type EventRow } from "@lib/models";
import { CouponEditor } from "@components/coupon-editor";
import { MatchCard } from "@components/match-card";

export function EventsBoard({
	events,
	date,
	coupons,
	selectedCouponId,
	asOf,
}: {
	events: EventRow[];
	date: string;
	coupons: Coupon[];
	selectedCouponId: string | undefined;
	asOf: number;
}) {
	const { t, locale, formatCurrency } = useI18n();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [pending, startTransition] = useTransition();
	const [selectedDate, setSelectedDate] = useOptimistic(date);
	const [rules, setRules] = useState<OddsFilterRule[]>([
		{ id: 0, selection: "1X", comparison: "between", from: "", to: "" },
	]);
	const [mode, setMode] = useState<OddsFilterMode>("all");

	function changeDate(value: string) {
		if (!validDate(value) || value === date) {
			return;
		}
		const params = new URLSearchParams(searchParams.toString());
		params.set("date", value);
		startTransition(() => {
			setSelectedDate(value);
			router.replace(`/?${params.toString()}`, { scroll: false });
		});
	}
	const [drafts, setDrafts] = useState<CouponDraft[]>(() =>
		coupons.length
			? coupons.map((coupon) => ({
					key: coupon.id,
					id: coupon.id,
					name: coupon.name,
					stake: coupon.stake?.toString() ?? "",
					items: coupon.coupon_items.map((item) => ({
						event_id: item.event_id,
						selection: item.selection,
						odds_at_add: item.odds_at_add,
						result: item.result,
						event: item.events,
					})),
					revision: 0,
					change: "items",
				}))
			: [
					{
						key: "new",
						id: null,
						name: t("coupon.defaultName"),
						stake: "",
						items: [],
						revision: 0,
						change: "items",
					},
				],
	);
	const [liveResults, setLiveResults] = useState<EventResult[]>([]);
	const displayEvents = useMemo(() => {
		const updates = new Map(liveResults.map((result) => [result.id, result]));
		return events.map((event) => mergeEventResult(event, updates.get(event.id)));
	}, [events, liveResults]);
	useResultsPolling(
		[
			...events.map((event) => event.id),
			...drafts.flatMap((draft) => draft.items.map((item) => item.event_id)),
		],
		drafts.flatMap((draft) => (draft.id ? [draft.id] : [])),
		(snapshot) => {
			const emptyKey = crypto.randomUUID();
			setLiveResults((current) =>
				JSON.stringify(current) === JSON.stringify(snapshot.events)
					? current
					: snapshot.events,
			);
			const updatedEvents = new Map(snapshot.events.map((result) => [result.id, result]));
			const updatedCoupons = new Map(snapshot.coupons.map((coupon) => [coupon.id, coupon]));
			setDrafts((current) => {
				let changed = false;
				const next = current.flatMap((draft) => {
					const saved = draft.id ? updatedCoupons.get(draft.id) : undefined;
					if (saved?.settled_at) {
						changed = true;
						return [];
					}
					let draftChanged = false;
					const items = draft.items.map((item) => {
						const event = mergeEventResult(
							item.event,
							updatedEvents.get(item.event_id),
						);
						const savedItem = saved?.coupon_items.find(
							(value) =>
								value.event_id === item.event_id &&
								value.selection === item.selection,
						);
						const result = savedItem?.result ?? item.result;
						if (event === item.event && result === item.result) {
							return item;
						}
						draftChanged = true;
						return { ...item, event, ...(result !== undefined ? { result } : {}) };
					});
					changed ||= draftChanged;
					return [draftChanged ? { ...draft, items } : draft];
				});
				if (!next.length) {
					return [
						{
							key: emptyKey,
							id: null,
							name: t("coupon.defaultName"),
							stake: "",
							items: [],
							revision: 0,
							change: "items",
						},
					];
				}
				return changed ? next : current;
			});
		},
	);
	const markPersisted = useCallback((key: string, id: string) => {
		setDrafts((current) =>
			current.some((draft) => draft.key === key && draft.id !== id)
				? current.map((draft) => (draft.key === key ? { ...draft, id } : draft))
				: current,
		);
	}, []);
	const [activeKey, setActiveKey] = useState(selectedCouponId ?? coupons[0]?.id ?? "new");
	const [busyKey, setBusyKey] = useState<string | null>(null);
	const activeDraft = drafts.find((draft) => draft.key === activeKey) ?? drafts[0];
	const selectedKey = activeDraft?.key ?? activeKey;
	const totals = useMemo(() => {
		let stake = 0;
		let winnings = 0;
		for (const draft of drafts) {
			if (!draft.items.length) {
				continue;
			}
			const amount = Number(draft.stake.replace(",", "."));
			const odds = combinedOdds(draft.items);
			if (
				!Number.isFinite(amount) ||
				amount < 0 ||
				amount > 9999999999.99 ||
				!Number.isFinite(odds) ||
				odds >= 1e10
			) {
				return null;
			}
			stake += amount;
			winnings += potentialWinnings(draft.items, amount);
		}
		return { stake, winnings };
	}, [drafts]);

	function updateDraft(key: string, update: Partial<Pick<CouponDraft, "items" | "stake">>) {
		setDrafts((current) =>
			current.map((draft) =>
				draft.key === key
					? {
							...draft,
							...update,
							revision: draft.revision + 1,
							change: update.items ? "items" : "stake",
						}
					: draft,
			),
		);
	}

	function addCoupon() {
		const key = crypto.randomUUID();
		setDrafts((current) => [
			...current,
			{
				key,
				id: null,
				name: t("coupon.defaultName"),
				stake: "",
				items: [],
				revision: 1,
				change: "items",
			},
		]);
		setActiveKey(key);
	}

	const choose = useCallback(
		(event: EventRow, selection: DraftItem["selection"]) => {
			const quote = event.odds[selection];
			if (
				pending ||
				busyKey === selectedKey ||
				!quote ||
				event.status !== "scheduled" ||
				Date.parse(event.kickoff) <= asOf
			) {
				return;
			}
			setDrafts((current) =>
				current.map((draft) => {
					if (draft.key !== selectedKey) {
						return draft;
					}
					const selected = draft.items.some(
						(item) => item.event_id === event.id && item.selection === selection,
					);
					const remaining = draft.items.filter((item) => item.event_id !== event.id);
					return {
						...draft,
						items: selected
							? remaining
							: [
									...remaining,
									{
										event_id: event.id,
										selection,
										odds_at_add: quote,
										event,
									},
								],
						revision: draft.revision + 1,
						change: "items",
					};
				}),
			);
		},
		[selectedKey, asOf, pending, busyKey],
	);
	const { visible, competitions } = useMemo(() => {
		const conditions = rules.flatMap((rule) => {
			const { condition } = parseOddsRule(rule);
			return condition ? [condition] : [];
		});
		const visible = displayEvents.filter((event) =>
			matchesOddsFilters(event.odds, conditions, mode),
		);
		const groups = new Map<string, EventRow[]>();
		for (const event of visible) {
			const key = competitionKey(event);
			const matches = groups.get(key) ?? [];
			matches.push(event);
			groups.set(key, matches);
		}
		for (const matches of groups.values()) {
			matches.sort(
				(a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff) || a.id.localeCompare(b.id),
			);
		}
		return {
			visible,
			competitions: [...groups.entries()].sort(([, a], [, b]) =>
				compareCompetitions(a[0]!, b[0]!, locale),
			),
		};
	}, [displayEvents, rules, mode, locale]);
	const selectedPicks = useMemo(
		() => new Map(activeDraft?.items.map((item) => [item.event_id, item.selection]) ?? []),
		[activeDraft],
	);

	return (
		<div className="workspace">
			<section className="events-panel">
				<div className="event-filters">
					<label className="date-filter">
						<span className="sr-only">{t("events.day")}</span>
						<input
							type="date"
							value={selectedDate}
							disabled={pending}
							aria-busy={pending}
							onChange={(event) => changeDate(event.target.value)}
						/>
						{pending && (
							<span className="date-loading" role="status">
								{t("events.loading")}
							</span>
						)}
					</label>
					<OddsFilters
						rules={rules}
						mode={mode}
						onRulesChange={setRules}
						onModeChange={setMode}
					/>
				</div>
				<div className="league-list" aria-busy={pending}>
					{competitions.map(([key, matches]) => (
						<section
							className="league-group"
							key={key}
							aria-label={[matches[0]!.competition, matches[0]!.country]
								.filter(Boolean)
								.join(" · ")}
						>
							<header className="league-heading">
								<h2>
									{matches[0]!.competition}
									{matches[0]!.country && (
										<span className="league-country">
											{matches[0]!.country}
										</span>
									)}
								</h2>
								<span aria-label={t("h2h.count", { count: matches.length })}>
									{matches.length}
								</span>
							</header>
							<div className="event-list">
								{matches.map((event) => (
									<MatchCard
										key={event.id}
										event={event}
										selection={selectedPicks.get(event.id)}
										asOf={asOf}
										onChoose={choose}
									/>
								))}
							</div>
						</section>
					))}
				</div>
				{!visible.length && (
					<div className="empty">
						{t(events.length ? "events.noMatches" : "events.empty")}
					</div>
				)}
			</section>
			<aside className="coupon-sidebar">
				<dl className="coupons-totals" aria-live="polite">
					<div>
						<dt>{t("coupons.totalStake")}</dt>
						<dd>{totals ? formatCurrency(totals.stake) : "—"}</dd>
					</div>
					<div>
						<dt>{t("coupons.totalWinnings")}</dt>
						<dd>{totals ? formatCurrency(totals.winnings) : "—"}</dd>
					</div>
				</dl>
				{drafts.map((draft) => (
					<CouponEditor
						key={draft.key}
						draft={draft}
						active={draft.key === selectedKey}
						onSaved={markPersisted}
						activate={() => setActiveKey(draft.key)}
						remove={(id) =>
							updateDraft(draft.key, {
								items: draft.items.filter((item) => item.event_id !== id),
							})
						}
						setStake={(stake) => updateDraft(draft.key, { stake })}
						canDelete={drafts.length > 1}
						actionsDisabled={busyKey !== null}
						onBusy={(busy) => setBusyKey(busy ? draft.key : null)}
						onCleared={() => updateDraft(draft.key, { items: [] })}
						onDeleted={() => {
							const remaining = drafts.filter((item) => item.key !== draft.key);
							setDrafts((current) =>
								current.filter((item) => item.key !== draft.key),
							);
							setActiveKey((current) =>
								current === draft.key ? remaining[0]!.key : current,
							);
						}}

						asOf={asOf}
					/>
				))}
				<button type="button" className="add-coupon" onClick={addCoupon}>
					{t("coupon.addAnother")}
				</button>
			</aside>
		</div>
	);
}
