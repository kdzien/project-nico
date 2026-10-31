"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@lib/i18n/provider";
import { displayedScore, mergeEventResult, type ResultsSnapshot } from "@lib/live-results";
import type { EventRow } from "@lib/models";

const empty: ResultsSnapshot = { events: [], coupons: [] };
const ResultsContext = createContext<ResultsSnapshot>(empty);

export function useResultsPolling(
	eventIds: string[],
	couponIds: string[],
	receive: (value: ResultsSnapshot) => void,
) {
	const callback = useRef(receive);
	useEffect(() => {
		callback.current = receive;
	}, [receive]);
	const eventsKey = [...new Set(eventIds)].sort().join(",");
	const couponsKey = [...new Set(couponIds)].sort().join(",");
	useEffect(() => {
		const events = eventsKey ? eventsKey.split(",") : [];
		const coupons = couponsKey ? couponsKey.split(",") : [];
		if (!events.length && !coupons.length) {
			return;
		}
		const abort = new AbortController();
		let running = false;
		async function refresh() {
			if (running || document.visibilityState !== "visible") {
				return;
			}
			running = true;
			try {
				const result: ResultsSnapshot = { events: [], coupons: [] };
				for (
					let offset = 0;
					offset < Math.max(events.length, coupons.length);
					offset += 250
				) {
					const response = await fetch("/api/results", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						cache: "no-store",
						signal: abort.signal,
						body: JSON.stringify({
							eventIds: events.slice(offset, offset + 250),
							couponIds: coupons.slice(offset, offset + 250),
						}),
					});
					if (!response.ok || response.redirected) {
						return;
					}
					const page = (await response.json()) as ResultsSnapshot;
					result.events.push(...page.events);
					result.coupons.push(...page.coupons);
				}
				if (!abort.signal.aborted) {
					callback.current(result);
				}
			} catch {
				// Keep the last saved snapshot when the local server is temporarily unavailable.
			} finally {
				running = false;
			}
		}
		const timer = setInterval(() => {
			void refresh();
		}, 60000);
		const visible = () => {
			if (document.visibilityState === "visible") {
				void refresh();
			}
		};
		document.addEventListener("visibilitychange", visible);
		void refresh();
		return () => {
			abort.abort();
			clearInterval(timer);
			document.removeEventListener("visibilitychange", visible);
		};
	}, [eventsKey, couponsKey]);
}

export function LiveResultsProvider({
	eventIds,
	couponIds,
	children,
}: {
	eventIds: string[];
	couponIds: string[];
	children: ReactNode;
}) {
	const [snapshot, setSnapshot] = useState<ResultsSnapshot>(empty);
	useResultsPolling(eventIds, couponIds, (next) => {
		setSnapshot((current) =>
			JSON.stringify(current) === JSON.stringify(next) ? current : next,
		);
	});
	return <ResultsContext.Provider value={snapshot}>{children}</ResultsContext.Provider>;
}

export function MatchProgress({
	event,
	showScore = false,
	showMinute = true,
}: {
	event: EventRow;
	showScore?: boolean;
	showMinute?: boolean;
}) {
	const snapshot = useContext(ResultsContext);
	const current = mergeEventResult(
		event,
		snapshot.events.find((item) => item.id === event.id),
	);
	const { t, statusLabel } = useI18n();
	const score = displayedScore(current);
	const live = current.status === "live";
	if ((!showScore && !live) || (!live && !score && current.status === "scheduled")) {
		return null;
	}
	const phase =
		current.match_phase === "halftime"
			? t("match.halftime")
			: current.match_phase === "penalties"
				? t("match.penalties")
				: null;
	return (
		<span className={`match-progress${live ? " match-progress-live" : ""}`}>
			{showScore && score && (
				<strong>
					{score[0]}:{score[1]}
				</strong>
			)}
			<span>{live ? t("match.live") : statusLabel(current.status)}</span>
			{live && phase && <span>{phase}</span>}
			{live && showMinute && current.match_minute !== null && (
				<span>{current.match_minute}′</span>
			)}
		</span>
	);
}

export function useResultsSnapshot() {
	return useContext(ResultsContext);
}

export function MatchClock({ event }: { event: EventRow }) {
	const snapshot = useContext(ResultsContext);
	const current = mergeEventResult(
		event,
		snapshot.events.find((item) => item.id === event.id),
	);
	const { t, formatDate } = useI18n();
	if (current.status !== "live") {
		return (
			<time dateTime={current.kickoff}>
				{formatDate(current.kickoff, { hour: "2-digit", minute: "2-digit" })}
			</time>
		);
	}
	const late =
		current.match_minute !== null &&
		current.match_minute.split("+").reduce((sum, part) => sum + Number(part), 0) > 80;
	return (
		<span className={`match-clock-live${late ? " match-clock-late" : ""}`}>
			{current.match_minute !== null
				? `${current.match_minute}′`
				: current.match_phase === "halftime"
					? t("match.halftime")
					: t("match.live")}
		</span>
	);
}
