# Project Nico

Prywatna aplikacja do przeglądania wydarzeń piłkarskich, budowania kuponów oraz późniejszego automatycznego rozliczania wyników. Projekt łączy aplikację Next.js, lokalny lub chmurowy Supabase oraz istniejący importer danych Meczyki.

Aktualny etap i kolejność prac znajdują się w `docs/IMPLEMENTATION_PLAN.md`. Decyzje techniczne opisuje `docs/ARCHITECTURE.md`.

## Wymagania

- Node.js,
- npm,
- Docker Desktop lub zgodny Docker Engine.

Internet jest potrzebny przy pierwszej instalacji, pobraniu obrazów Dockera i uruchamianiu importera. Po wykonaniu setupu aplikacja, baza, logowanie, migracje mogą działać offline.

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

Aktualizacja istniejącej lokalnej bazy bez usuwania danych:

```bash
npm run db:migrate
```

Project Nico używa portów Supabase `55320–55329`, żeby nie kolidować z innymi lokalnymi projektami.

## Kontrola jakości

```bash
npm run lint
npm run typecheck
npm run format:check
npm run build
```

## Importer

Importer pobiera listę meczów, orientacyjne kursy `1`, `X`, `2`, wyliczone `1X` i `2X`, tabelę, historię drużyn i H2H. Nie utrwala informacji o bukmacherze i nie używa mechanizmów omijających zabezpieczenia.

Domyślnie zapisuje wydarzenia do lokalnej bazy i historię uruchomienia w `import_runs`:

```bash
npm run collect
```

Test pojedynczego wydarzenia:

```bash
TARGET_DATE=2026-10-27 MAX_MATCHES=1 npm run collect
```

Zmienne importera:

| Zmienna            | Domyślnie              | Znaczenie                                                                                  |
| ------------------ | ---------------------- | ------------------------------------------------------------------------------------------ |
| `TARGET_DATE`      | dziś w `Europe/Warsaw` | Data w formacie `YYYY-MM-DD`                                                               |
| `REQUEST_DELAY_MS` | `350`                  | Minimalny odstęp pomiędzy zapytaniami                                                      |
| `RETRIES`          | `3`                    | Ponowienia po HTTP 429 lub błędzie serwera                                                 |
| `MAX_MATCHES`      | bez limitu             | Ograniczenie przy testach                                                                  |
| `COLLECT_OUTPUT`   | baza                   | `json` uruchamia zapis wyłącznie do JSON-a, bez bazy                                       |
| `OUTPUT_PATH`      | brak                   | Dodatkowy JSON pod wskazaną ścieżką; w trybie `json` domyślnie `outputs/matches-DATA.json` |

JSON bez zapisu do bazy (także bez konfiguracji Supabase):

```bash
COLLECT_OUTPUT=json npm run collect
```

Importer nie obcina listy wydarzeń. `MAX_MATCHES` służy jedynie ręcznym próbom; taki import zawiera niepełny dzień. Supabase pobiera konfigurację z `.env.local`; kod aplikacji i importer nie wybierają automatycznie produkcyjnej bazy.

## Konto i logowanie

Publiczna rejestracja jest wyłączona w `supabase/config.toml`; aplikacja nie udostępnia formularza rejestracji. Nadrzędne `auth.enable_signup = false` blokuje nowe konta; `auth.email.enable_signup = true` musi pozostać włączone, ponieważ lokalny CLI używa go także do włączenia logowania e-mailem. Utwórz właściciela przez serwerowy proces administracyjny:

```bash
OWNER_EMAIL='twoj-email@example.com' OWNER_PASSWORD='wlasne-dlugie-haslo' npm run owner:create
```

Następnie zaloguj się pod `/login`. Hasło musi mieć co najmniej 10 znaków. Konto jest przechowywane w lokalnym Supabase i przetrwa jego zatrzymanie. `db:reset` usuwa dane, w tym konta. Przy podłączeniu zewnętrznego Supabase należy również wyłączyć **Allow new users to sign up** w konfiguracji Auth tego projektu; lokalny plik nie zmienia ustawień zdalnego serwera.

## Kupony

Wybierz kurs przy przyszłym wydarzeniu. Kolejny typ dla tego samego meczu zastąpi poprzedni. Zapisz wersję roboczą przed zmianą dnia lub opuszczeniem ekranu. Na liście **Moje kupony** możesz otworzyć wersję roboczą do dalszej edycji albo usunąć własny kupon.

**Zamknij i śledź wyniki** blokuje dalszą edycję pozycji i włącza rozliczanie. Jest to zapis typów do obserwacji, bez wykonywania zakładu. Nie można zamknąć kuponu po rozpoczęciu któregokolwiek z jego wydarzeń. Zapisane pozycje zachowują kurs mimo kolejnych importów.

## Wyniki

```bash
npm run results
```

Proces korzysta wyłącznie z `GET /matches-by-competition/all?day=DATA&page=STRONA&matches_per_page=20`. Z bazy wybiera nierozliczone wydarzenia z dni do dzisiaj w `Europe/Warsaw`, grupuje je po dniu i pobiera kolejne strony każdej listy aż do krótszej odpowiedzi. Nie pobiera kursów, statystyk, historii drużyn ani szczegółów pojedynczego meczu. Dopasowuje spotkania po zewnętrznym ID; nie dodaje nowych wydarzeń.

Zakończone mecze z pełnym wynikiem regulaminowym aktualizują bazę i rozliczają zamknięte kupony. Anulowane dają zwrot. Zmiany terminu/statusu są zapisywane także dla nierozstrzygniętych spotkań, a niezmienione rekordy są pomijane. Brak spotkania na liście nie jest traktowany jako anulowanie: pozostaje oczekujące. Domyślnie skrypt sprawdza również dzisiejszą listę, by znaleźć przełożone spotkania; nie szuka nowego terminu na wszystkich przyszłych listach.

Sprawdzenie wyłącznie wydarzeń zapisanych pod konkretnym dniem:

```bash
TARGET_DATE=2026-10-27 npm run results
```

Ten wariant pobiera listę tylko wskazanego dnia. Bez `TARGET_DATE` sprawdzane są także zaległości. Przyszłe dni są pomijane. Podsumowanie pokazuje liczbę sprawdzonych, zaktualizowanych, rozliczonych i nieznalezionych wydarzeń.

Każde wydarzenie wraz z odpowiadającymi mu pozycjami i kuponami jest aktualizowane transakcyjnie. Zadanie można bezpiecznie ponawiać; nie nadpisuje rozliczonych wyników. Awaria jednego pobrania nie blokuje pozostałych, ale całe uruchomienie otrzyma status błędu i zachowa liczniki postępu w `import_runs`.

- Wynik dotyczy regulaminowego czasu: pola `home_regular_time_score` i `away_regular_time_score` z `attributes`. Ogólny wynik jest używany wyłącznie przy jawnym `withOvertime: false` i braku pól regulaminowych.
- Anulowanie: zwrot pozycji, mnożnik `1.00` w kursie łącznym; `odds_at_add` pozostaje zachowany.
- Przełożenie, nieznany status lub niepełny wynik: pozycja oczekuje na kolejne pobranie, bez automatycznego anulowania po upływie czasu.
- Kupon przegrywa po przegranej dowolnej pozycji; znacznik zakończenia pojawia się dopiero po rozliczeniu wszystkich pozycji. Wszystkie zwroty dają status zwrotu; wygrane i zwroty dają wygraną.
- Wersje robocze nie są rozliczane. Zmiana już utrwalonego wyniku wymaga osobnej, świadomej procedury korekty; zwykły import go nie zmienia.

Etapy 7 i 8 nie zostały wdrożone: procesy importu oraz wyników uruchamiasz ręcznie, bez harmonogramu i wdrożenia chmurowego.

## Ustawienia, języki i motywy

Na ekranie **Ustawienia** (`/settings`) wybierzesz język polski lub angielski oraz jasny lub ciemny motyw. Przycisk **Zapisz ustawienia** stosuje obie zmiany. Wybór jest zapamiętywany przez rok w tej przeglądarce i pozostaje aktywny po odświeżeniu, przejściu na inną stronę i wylogowaniu. Domyślnie aplikacja używa języka polskiego i ciemnego motywu.

Tłumaczenia znajdują się w `src/lib/i18n/messages/pl.json` oraz `en.json`. Te same klucze obowiązują po stronie serwera i przeglądarki. Język zmienia również format dat, liczb i stawek; strefa czasu pozostaje Europe/Warsaw, a waluta PLN. Nazwy drużyn, rozgrywek i własne nazwy kuponów pozostają danymi użytkownika lub dostawcy.

## Styl kodu

Kod używa tabulatorów o szerokości 4 i czytelnego JSX z podziałem na linie. Konfigurację edytora określa `.editorconfig`, formatowanie `.prettierrc.json`, a ESLint wymaga klamer we wszystkich warunkach i pętlach.

```bash
npm run format
npm run format:check
```

Zgodnie z decyzją właściciela testy i ich runner zostały usunięte. Nie dodajemy kolejnych. Weryfikacja obejmuje lint, TypeScript, formatowanie, build i ręczne sprawdzenie działania.
