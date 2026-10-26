# Architektura Project Nico

## Założenia

- Aplikacja jest prywatna i przeznaczona początkowo dla jednego użytkownika.
- Logowanie odbywa się przez e-mail i hasło.
- Aplikacja działa lokalnie bez internetu, poza importem danych z zewnętrznego API.
- Produkcja korzysta z Vercel oraz Supabase, a development z lokalnego Supabase uruchamianego w Dockerze.
- Kursy są orientacyjne. Nie pokazujemy ani nie utrwalamy nazwy bukmachera.
- Pobieramy wszystkie dostępne wydarzenia, a interfejs zapewnia filtrowanie.

## Elementy systemu

### Aplikacja webowa

Next.js z App Routerem odpowiada za interfejs, sesję użytkownika oraz operacje wykonywane na kuponach. Kod aplikacji znajduje się w `src/app`, a współdzielona logika w `src/lib`.

### Baza i logowanie

Supabase zapewnia PostgreSQL i Auth. Lokalnie działa w kontenerach Dockera, dzięki czemu lista wydarzeń, logowanie i kupony nie wymagają internetu. Produkcyjne sekrety nie mogą trafić do kodu przeglądarki.

### Importer

Importer w `scripts/collect.ts` korzysta z klienta w `src/lib/collector`. To jedyny element podstawowego workflow, który wymaga dostępu do internetu. Docelowo zapisuje dane przez implementację `CollectionRepository` do Supabase; zapis JSON pozostaje narzędziem diagnostycznym.

### Harmonogram

W produkcji importer uruchomi GitHub Actions. Import wydarzeń i późniejsze rozliczanie wyników są osobnymi zadaniami, aby można je było niezależnie ponawiać i monitorować.

## Model danych

### `events`

Jeden rekord reprezentuje jedno wydarzenie z zewnętrznego źródła. Pola używane do filtrowania i aktualizacji są kolumnami, a rozbudowane statystyki są przechowywane jako JSONB.

- identyfikacja: `provider`, `external_id`,
- opis: liga, runda, gospodarz, gość,
- czas i stan: `kickoff`, `status`, wynik i czas rozliczenia,
- dane elastyczne: `odds`, `statistics`.

Unikalna para `(provider, external_id)` pozwala bezpiecznie ponawiać import przez upsert.

### `coupons` i `coupon_items`

Kupon należy do użytkownika, a każda pozycja wskazuje konkretne wydarzenie. Pozycja zapisuje typ i `odds_at_add`, żeby późniejsza zmiana kursu nie modyfikowała historycznego kuponu. Wynik pozycji jest rozliczany niezależnie, a wynik kuponu wynika z jego pozycji.

### `import_runs`

Tabela przechowuje rozpoczęcie, zakończenie, status i błędy każdego importu. Dzięki niej brak danych nie jest mylony z poprawnym importem dnia bez wydarzeń.

## Granice JSONB

Nazwy drużyn i ligi pozostają bezpośrednio w `events`. Nie tworzymy jeszcze tabel `teams` i `competitions`. `odds` oraz `statistics` są JSONB, ponieważ ich struktura może ewoluować. Kuponów nie zapisujemy jako jeden JSON, ponieważ wymagają relacji, autoryzacji i niezależnego rozliczania pozycji.

## Dostęp i bezpieczeństwo

- Niezalogowany użytkownik nie odczytuje danych aplikacji.
- Zalogowany użytkownik może czytać wydarzenia oraz importy.
- Użytkownik zarządza tylko własnymi kuponami i pozycjami.
- Importer używa sekretnego klucza wyłącznie po stronie serwera i może zapisywać wydarzenia.
- Publiczna rejestracja ma być wyłączona w produkcji; konto właściciela powstaje ręcznie.

## Praca offline

Po jednorazowym wykonaniu instalacji oraz pobraniu obrazów Supabase:

- `npm run db:start` uruchamia lokalną bazę i Auth,
- `npm run dev` uruchamia aplikację,
- lokalne dane pozostają w wolumenach Dockera,
- aplikacja nie kontaktuje się z produkcyjnym Supabase,
- `npm run collect` nadal wymaga internetu.

Pełna reinstalacja zależności lub pierwsze pobranie obrazów Dockera wymaga sieci. Zwykłe kodowanie, uruchamianie aplikacji, migracje i testy działają offline.
