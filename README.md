# Project Nico

Aplikacja dla wielu użytkowników do przeglądania wydarzeń piłkarskich, budowania kuponów oraz późniejszego automatycznego rozliczania wyników. Projekt łączy aplikację Next.js, lokalny lub chmurowy Supabase oraz istniejący importer danych Meczyki.

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

## Supabase i Docker

Supabase już działa w Dockerze: PostgreSQL, Auth, API i Studio są kontenerami widocznymi w Docker Desktop. Polecenie `npm run db:start` używa Supabase CLI do ich uruchomienia, a `npm run db:stop` zatrzymuje wyłącznie kontenery tego projektu.

Folder `supabase/` nie zawiera działającego serwera ani danych bazy. Trzymamy tam `config.toml` i wersjonowane migracje, żeby każdy mógł odtworzyć ten sam schemat. Dane znajdują się w wolumenach Dockera. Aplikacja Next.js działa na hoście i łączy się z API kontenerów pod `http://127.0.0.1:55321`.

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

## Rejestracja i logowanie

Otwórz `/register` lub wybierz **Załóż konto** na ekranie logowania. Podaj e-mail, hasło (8–128 znaków) i powtórz hasło. Nie ma roli administratora aplikacji, konta właściciela ani skryptu tworzącego konta.

Lokalnie rejestracja jest włączona i nie wymaga potwierdzenia e-maila, więc po utworzeniu konta od razu przechodzisz do aplikacji. Istniejące konta nadal działają. Każdy użytkownik widzi wspólne wydarzenia, ale wyłącznie własne kupony; dostęp egzekwuje RLS w bazie.

Jeśli zewnętrzny Supabase wymaga potwierdzenia adresu, aplikacja wyświetli komunikat o e-mailu i obsłuży powrót przez `/auth/callback`. W konfiguracji Auth takiego serwera włącz rejestrację i dodaj adres aplikacji z `/auth/callback` do dozwolonych przekierowań. Link należy otworzyć w tej samej przeglądarce, w której rozpoczęto rejestrację.

Konta i kupony są przechowywane w bazie w Dockerze i przetrwają zatrzymanie kontenerów. `db:reset` usuwa dane, w tym konta. Klucz sekretny pozostaje wyłącznie w procesach importu wydarzeń i wyników; rejestracja korzysta z publicznego klienta Auth.

## Lista meczów

Mecze są pogrupowane według ligi, a wewnątrz grupy uporządkowane godziną rozpoczęcia. Nad listą są dwa filtry: data i warunki kursów. Wybór daty od razu pobiera zapisane wydarzenia danego dnia, bez przycisku zatwierdzania.

Filtr kursów obsługuje typy `1`, `1X`, `X`, `2X`, `2`, zakres od–do (z granicami włącznie) oraz `<`, `≤`, `>`, `≥` i `=`. Można dodawać i usuwać warunki oraz wybrać, czy muszą być spełnione wszystkie, czy dowolny. Przykład: `1X od 1 do 1,5` lub `1 poniżej 2` z opcją **LUB**.

Filtrowanie działa od razu podczas wpisywania. Liczby przyjmują przecinek lub kropkę. Puste warunki nie filtrują, a niepoprawne pokazują błąd i nie są stosowane. Przy zakresie można podać tylko dolną lub tylko górną granicę. Brak kursu nie jest traktowany jako zero i nie spełnia warunku dotyczącego tego typu.

Karta pokazuje gospodarza po lewej, gościa po prawej i wynik pośrodku. Pod nazwami znajdują się kwadraty W/D/L z całą zapisaną historią, od najnowszego meczu. Najazd lub ustawienie fokusu na kwadracie pokazuje datę, drużyny i dokładny wynik. Pozycja i punkty ligowe są pokazane skrótowo obok nazwy drużyny, jeśli zapisano tabelę.

Sekcja H2H jest obecnie ukryta; dane nadal są pobierane i zapisywane. Karta nie powtarza nazwy ligi, ról drużyn ani wiersza statusu. Kursy i wybór pozycji do kuponu znajdują się na dole karty.

## Kupony

Wybierz kurs przy przyszłym wydarzeniu. Pierwszy typ automatycznie tworzy kupon, a kolejne zmiany zapisują się bez przycisku zapisu. Inny typ tego samego meczu zastępuje poprzedni. Usunięcie ostatniego typu pozostawia pusty kupon.

Po prawej widać osobne, proste boksy: liczba pozycji, mecze z typami i kursami, kurs łączny, stawka i potencjalna wygrana (stawka × kurs). **Dodaj kolejny kupon** tworzy i wybiera pusty kupon. Kliknięcie boksu wybiera kupon do dodawania typów; jeden kupon jest wybrany domyślnie. Zmiana dnia zachowuje wybór i pozycje, a zapisane kupony wracają po odświeżeniu.

Niepuste kupony od razu podlegają automatycznemu rozliczeniu. Rozpoczętych i niedostępnych pozycji nie można pojedynczo zmieniać ani usuwać. **Wyczyść** usuwa wszystkie wydarzenia kuponu, zachowując stawkę. **Usuń kupon** usuwa cały boks; przy jednym kuponie przycisk jest ukryty. Operacje są kolejkowane z automatycznym zapisem. Kurs pozycji jest zachowany z chwili jej dodania. Lista **Moje kupony** zawiera również wyniki i możliwość usunięcia własnego kuponu. Migracja `202610280001_coupon_autosave.sql` obejmuje dotychczasowe wersje robocze automatycznym rozliczaniem, zachowując ich identyfikatory i kursy.

## Wyniki

```bash
npm run results
```

Proces korzysta wyłącznie z `GET /matches-by-competition/all?day=DATA&page=STRONA&matches_per_page=20`. Z bazy wybiera nierozliczone wydarzenia z dni do dzisiaj w `Europe/Warsaw`, grupuje je po dniu i pobiera kolejne strony każdej listy aż do krótszej odpowiedzi. Nie pobiera kursów, statystyk, historii drużyn ani szczegółów pojedynczego meczu. Dopasowuje spotkania po zewnętrznym ID; nie dodaje nowych wydarzeń.

Zakończone mecze z pełnym wynikiem regulaminowym aktualizują bazę i rozliczają zapisane kupony. Anulowane dają zwrot. Zmiany terminu/statusu są zapisywane także dla nierozstrzygniętych spotkań, a niezmienione rekordy są pomijane. Brak spotkania na liście nie jest traktowany jako anulowanie: pozostaje oczekujące. Domyślnie skrypt sprawdza również dzisiejszą listę, by znaleźć przełożone spotkania; nie szuka nowego terminu na wszystkich przyszłych listach.

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

## Next.js dla osoby przychodzącej z Angulara

Aliasy w `tsconfig.json` działają w Next.js bez dodatkowego pluginu: `@lib/*` wskazuje `src/lib/*`, `@components/*` wskazuje `src/components/*`, a `@app/*` wskazuje `src/app/*`. Dlatego `@lib/supabase/server` wskazuje `src/lib/supabase/server.ts`, podobnie jak aliasy importów w Angularze. Procesy uruchamiane przez `tsx` korzystają z tego samego ustawienia.

| Plik / katalog              | Rola                                                                    |
| --------------------------- | ----------------------------------------------------------------------- |
| `src/app/page.tsx`          | Strona pod `/`                                                          |
| `src/app/register/page.tsx` | Strona pod `/register`; routing wynika z katalogów                      |
| `src/app/layout.tsx`        | Wspólny układ, który renderuje `children` stron                         |
| `src/app/**/actions.ts`     | Funkcje z `"use server"`, np. obsługa formularza wykonywana na serwerze |
| `src/app/**/route.ts`       | Endpoint HTTP; np. callback logowania                                   |
| `src/components`            | Współdzielone komponenty React                                          |
| `src/lib`                   | Wspólna logika, klient bazy i tłumaczenia                               |

Komponenty App Routera domyślnie wykonują się na serwerze. `"use client"` oznacza komponent interaktywny, który może korzystać ze stanu i zdarzeń w przeglądarce. To główna różnica względem typowego komponentu Angulara wykonywanego w przeglądarce.
