# Project Nico

Prywatna aplikacja do przeglądania wydarzeń piłkarskich, budowania kuponów oraz późniejszego automatycznego rozliczania wyników. Projekt łączy aplikację Next.js, lokalny lub chmurowy Supabase oraz istniejący importer danych Meczyki.

Aktualny etap i kolejność prac znajdują się w `docs/IMPLEMENTATION_PLAN.md`. Decyzje techniczne opisuje `docs/ARCHITECTURE.md`.

## Wymagania

- Node.js,
- npm,
- Docker Desktop lub zgodny Docker Engine.

Internet jest potrzebny przy pierwszej instalacji, pobraniu obrazów Dockera i uruchamianiu importera. Po wykonaniu setupu aplikacja, baza, logowanie, migracje i testy mogą działać offline.

## Pierwsze uruchomienie

```bash
npm install
npm run local:setup
npm run dev
```

Aplikacja będzie dostępna pod `http://localhost:3000`, a lokalny panel Supabase pod `http://127.0.0.1:55323`.

Kolejne uruchomienia:

```bash
npm run db:start
npm run dev
```

Zatrzymanie lokalnej bazy:

```bash
npm run db:stop
```

Reset bazy i ponowne zastosowanie wszystkich migracji:

```bash
npm run db:reset
```

Project Nico używa portów Supabase `55320–55329`, żeby nie kolidować z innymi lokalnymi projektami.

## Kontrola jakości

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Importer

Importer pobiera listę meczów, orientacyjne kursy `1`, `X`, `2`, wyliczone `1X` i `2X`, tabelę, historię drużyn i H2H. Nie utrwala informacji o bukmacherze i nie używa mechanizmów omijających zabezpieczenia.

Na obecnym etapie zapisuje diagnostyczny JSON:

```bash
npm run collect
```

Test pojedynczego wydarzenia:

```bash
TARGET_DATE=2026-10-27 MAX_MATCHES=1 npm run collect
```

Zmienne importera:

| Zmienna | Domyślnie | Znaczenie |
| --- | --- | --- |
| `TARGET_DATE` | jutro | Data w formacie `YYYY-MM-DD` |
| `TIMEZONE` | `Europe/Warsaw` | Strefa wyznaczania daty |
| `REQUEST_DELAY_MS` | `350` | Minimalny odstęp pomiędzy zapytaniami |
| `RETRIES` | `3` | Ponowienia po HTTP 429 lub błędzie serwera |
| `MAX_MATCHES` | bez limitu | Ograniczenie przy testach |
| `OUTPUT_PATH` | `outputs/matches-DATA.json` | Diagnostyczny plik wynikowy |

W etapie 3 importer otrzyma zapis do tabeli `events`; JSON pozostanie opcjonalnym narzędziem diagnostycznym.
