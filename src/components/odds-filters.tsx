"use client";

import { useRef } from "react";
import { selections, type Selection } from "@lib/models";
import {
	oddsComparisons,
	parseOddsRule,
	type OddsComparison,
	type OddsFilterMode,
	type OddsFilterRule,
} from "@lib/odds-filters";
import { useI18n } from "@lib/i18n/provider";
import type { MessageKey } from "@lib/i18n";

const comparisonLabels: Record<OddsComparison, MessageKey> = {
	between: "oddsFilter.between",
	lt: "oddsFilter.lt",
	lte: "oddsFilter.lte",
	gt: "oddsFilter.gt",
	gte: "oddsFilter.gte",
	eq: "oddsFilter.eq",
};

interface OddsFiltersProps {
	rules: OddsFilterRule[];
	mode: OddsFilterMode;
	onRulesChange: (rules: OddsFilterRule[]) => void;
	onModeChange: (mode: OddsFilterMode) => void;
}

export function OddsFilters({ rules, mode, onRulesChange, onModeChange }: OddsFiltersProps) {
	const { t, formatNumber } = useI18n();
	const nextId = useRef(1);

	function addRule() {
		const id = nextId.current++;
		onRulesChange([...rules, { id, selection: "1X", comparison: "between", from: "", to: "" }]);
	}

	function updateRule(id: number, change: Partial<OddsFilterRule>) {
		onRulesChange(rules.map((rule) => (rule.id === id ? { ...rule, ...change } : rule)));
	}

	return (
		<section className="odds-filter" aria-label={t("oddsFilter.title")}>
			{rules.length > 1 && (
				<div className="odds-filter-mode" role="group" aria-label={t("oddsFilter.match")}>
					{(["all", "any"] as const).map((value) => (
						<button
							key={value}
							type="button"
							aria-pressed={mode === value}
							aria-label={t(value === "all" ? "oddsFilter.all" : "oddsFilter.any")}
							onClick={() => onModeChange(value)}
						>
							{t(value === "all" ? "oddsFilter.and" : "oddsFilter.or")}
						</button>
					))}
				</div>
			)}

			<div className="odds-filter-rules">
				{rules.map((rule, index) => {
					const { error } = parseOddsRule(rule);
					const errorId = `odds-rule-error-${rule.id}`;

					return (
						<div
							className="odds-filter-rule"
							key={rule.id}
							role="group"
							aria-label={t("oddsFilter.condition", { number: index + 1 })}
						>
							<div className="odds-filter-row">
								<select
									className="filter-selection"
									aria-label={t("oddsFilter.selection")}
									value={rule.selection}
									onChange={(event) =>
										updateRule(rule.id, {
											selection: event.target.value as Selection,
										})
									}
								>
									{selections.map((selection) => (
										<option key={selection}>{selection}</option>
									))}
								</select>
								<select
									className="filter-comparison"
									aria-label={t("oddsFilter.comparison")}
									value={rule.comparison}
									onChange={(event) =>
										updateRule(rule.id, {
											comparison: event.target.value as OddsComparison,
										})
									}
								>
									{oddsComparisons.map((comparison) => (
										<option key={comparison} value={comparison}>
											{t(comparisonLabels[comparison])}
										</option>
									))}
								</select>
								<input
									type="text"
									inputMode="decimal"
									aria-label={t(
										rule.comparison === "between"
											? "oddsFilter.from"
											: "oddsFilter.value",
									)}
									value={rule.from}
									maxLength={16}
									placeholder={formatNumber(1)}
									aria-invalid={Boolean(error)}
									aria-describedby={error ? errorId : undefined}
									onChange={(event) =>
										updateRule(rule.id, { from: event.target.value })
									}
								/>
								{rule.comparison === "between" && (
									<>
										<span className="filter-range-separator" aria-hidden="true">
											–
										</span>
										<input
											type="text"
											inputMode="decimal"
											aria-label={t("oddsFilter.to")}
											value={rule.to}
											maxLength={16}
											placeholder={formatNumber(1.5)}
											aria-invalid={Boolean(error)}
											aria-describedby={error ? errorId : undefined}
											onChange={(event) =>
												updateRule(rule.id, { to: event.target.value })
											}
										/>
									</>
								)}
								<button
									type="button"
									className="filter-remove"
									aria-label={t("oddsFilter.remove", { number: index + 1 })}
									onClick={() =>
										onRulesChange(rules.filter((item) => item.id !== rule.id))
									}
								>
									<span aria-hidden="true">×</span>
								</button>
							</div>
							{error && (
								<p className="filter-error" id={errorId} role="status">
									{t(
										error === "invalidRange"
											? "oddsFilter.invalidRange"
											: "oddsFilter.invalidNumber",
									)}
								</p>
							)}
						</div>
					);
				})}
			</div>

			<div className="odds-filter-actions">
				<button type="button" className="filter-add" onClick={addRule}>
					{t("oddsFilter.add")}
				</button>
				{rules.length > 0 && (
					<button
						type="button"
						className="filter-clear"
						onClick={() => onRulesChange([])}
					>
						{t("oddsFilter.clear")}
					</button>
				)}
			</div>
		</section>
	);
}
