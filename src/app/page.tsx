const plannedFeatures = [
  "Lista dzisiejszych wydarzeń i kursów orientacyjnych",
  "Statystyki drużyn oraz bezpośrednich spotkań",
  "Budowanie i zapisywanie własnych kuponów",
  "Automatyczne uzupełnianie wyników i rozliczanie typów",
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">PROJECT NICO</p>
        <h1>Twój prywatny warsztat do układania kuponów.</h1>
        <p className="lead">
          Fundament aplikacji działa. Kolejne etapy podłączą lokalną bazę, logowanie,
          wydarzenia i kupony.
        </p>
        <div className="status">
          <span className="statusDot" aria-hidden="true" />
          Etap 1: szkielet aplikacji
        </div>
      </section>

      <section className="featureGrid" aria-label="Planowane funkcje">
        {plannedFeatures.map((feature, index) => (
          <article className="featureCard" key={feature}>
            <span>0{index + 1}</span>
            <p>{feature}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
