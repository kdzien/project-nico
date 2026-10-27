"use client";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <main className="shell"><h1 className="error-title">Nie udało się wczytać danych.</h1><p className="lead">Sprawdź, czy lokalna baza jest uruchomiona, i spróbuj ponownie.</p><button onClick={reset}>Spróbuj ponownie</button></main>;
}
