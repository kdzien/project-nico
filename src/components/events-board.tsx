"use client";
import { useState } from "react";
import { selections, statusLabel, type Coupon, type DraftItem, type EventRow } from "@/lib/models";
import { CouponEditor } from "./coupon-editor";
import { EventStatistics } from "./event-statistics";

export function EventsBoard({ events, coupon = null, asOf }: { events: EventRow[]; coupon?: Coupon | null; asOf: number }) {
  const [items, setItems] = useState<DraftItem[]>(() => coupon?.coupon_items.map((item) => ({ event_id: item.event_id, selection: item.selection, odds_at_add: item.odds_at_add, event: item.events })) ?? []);
  const remove = (id: string) => setItems((current) => current.filter((item) => item.event_id !== id));
  function choose(event: EventRow, selection: DraftItem["selection"]) {
    const quote = event.odds[selection];
    if (!quote || event.status !== "scheduled" || new Date(event.kickoff).getTime() <= asOf) return;
    setItems((current) => {
      if (current.some((item) => item.event_id === event.id && item.selection === selection)) return current.filter((item) => item.event_id !== event.id);
      return [...current.filter((item) => item.event_id !== event.id), { event_id: event.id, selection, odds_at_add: quote, event }];
    });
  }
  const [league, setLeague] = useState("");
  const [team, setTeam] = useState("");
  const [status, setStatus] = useState("");
  const leagues = [...new Set(events.map((event) => event.competition))].sort();
  const statuses = [...new Set(events.map((event) => event.status))];
  const visible = events.filter((event) => (!league || event.competition === league) && (!status || event.status === status) &&
    `${event.home_team} ${event.away_team}`.toLocaleLowerCase("pl").includes(team.toLocaleLowerCase("pl")));
  return <div className="workspace"><section className="events-panel">
    <div className="filters"><label>Liga<select value={league} onChange={(e) => setLeague(e.target.value)}><option value="">Wszystkie ligi</option>{leagues.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label>Drużyna<input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Szukaj drużyny…" type="search" /></label>
      <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Wszystkie statusy</option>{statuses.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label></div>
    <p className="muted" aria-live="polite">Wydarzenia: {visible.length} z {events.length} · Kursy orientacyjne</p>
    <div className="event-list">{visible.map((event) => <article className="event-card" key={event.id}>
      <div className="event-meta"><span>{event.competition}{event.round ? ` · ${event.round}` : ""}</span><span>{statusLabel(event.status)}</span></div>
      <div className="event-main"><time dateTime={event.kickoff}>{new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit" }).format(new Date(event.kickoff))}</time>
        <h3>{event.home_team}<span className="versus"> – </span>{event.away_team}</h3>
        {event.home_score !== null && event.away_score !== null && <strong>{event.home_score} : {event.away_score}</strong>}</div>
      <div className="odds-grid">{selections.map((selection) => <button type="button" aria-label={`${event.home_team} – ${event.away_team}: ${selection}, kurs ${event.odds[selection] ?? "niedostępny"}`} aria-pressed={items.some((item) => item.event_id === event.id && item.selection === selection)} disabled={!event.odds[selection] || event.status !== "scheduled" || new Date(event.kickoff).getTime() <= asOf} onClick={() => choose(event, selection)} className="odd" key={selection}><span>{selection}</span><strong>{event.odds[selection]?.toFixed(2) ?? "—"}</strong></button>)}</div>
      <EventStatistics event={event} />
    </article>)}</div>
    {!visible.length && <div className="empty">{events.length ? "Brak wydarzeń pasujących do filtrów." : "Brak zapisanych wydarzeń na ten dzień."}</div>}
  </section><CouponEditor items={items} remove={remove} coupon={coupon} /></div>;
}
