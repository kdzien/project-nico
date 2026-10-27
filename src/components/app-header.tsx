import Link from "next/link";
import { logout } from "@/app/login/actions";
export function AppHeader() {
  return <header className="topbar"><Link href="/" className="brand">NICO<span>Twój piłkarski warsztat</span></Link>
    <nav aria-label="Główna nawigacja"><Link href="/">Wydarzenia</Link><Link href="/coupons">Moje kupony</Link><form action={logout}><button className="secondary">Wyloguj się</button></form></nav></header>;
}
