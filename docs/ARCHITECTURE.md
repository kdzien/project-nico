# Architektura Project Nico

## Założenia

- Aplikacja obsługuje publiczną rejestrację wielu użytkowników; każdy zarządza własnymi kuponami.
- Rejestracja i logowanie odbywają się przez e-mail i hasło w Supabase Auth.
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

Importer w `scripts/collect.ts` korzysta z klienta w `src/lib/collector`. To jedyny element podstawowego workflow, który wymaga dostępu do internetu. Zapisuje dane przez implementację `CollectionRepository` (`SupabaseRepository`) do Supabase; zapis JSON pozostaje narzędziem diagnostycznym.

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

Nazwy drużyn i ligi pozostają bezpośrednio w `events`. Metadane rozgrywek (`competition_id`, `competition_slug`, `competition_type`, `competition_level`, `competition_display_order`, `country_id`, `country`, `country_slug`) są nullable kolumnami tej samej tabeli, pochodzącymi z `match.competition`. Poziom oznacza szczebel rozgrywek, a nie pozycję drużyny w tabeli. Dla pucharu może być null. Grupowanie używa ID rozgrywek, aby nie łączyć pucharów z różnych krajów o jednakowych nazwach. Tabela `teams` przechowuje stabilną tożsamość drużyny i pojedynczy herb; `events.home_team_id` i `away_team_id` wskazują jej UUID. Nie tworzymy tabeli `competitions`. `odds` oraz `statistics` są JSONB, ponieważ ich struktura może ewoluować. Kuponów nie zapisujemy jako jeden JSON, ponieważ wymagają relacji, autoryzacji i niezależnego rozliczania pozycji.

## Dostęp i bezpieczeństwo

- Niezalogowany użytkownik nie odczytuje danych aplikacji.
- Zalogowany użytkownik może czytać wydarzenia oraz importy.
- Użytkownik zarządza tylko własnymi kuponami i pozycjami.
- Importer używa sekretnego klucza wyłącznie po stronie serwera i może zapisywać wydarzenia.
- Rejestracja jest publiczna. Nie ma osobnego administratora aplikacji ani ręcznego zakładania kont. Istniejące RLS rozdziela kupony po `auth.uid()`.

## Praca offline

Po jednorazowym wykonaniu instalacji oraz pobraniu obrazów Supabase:

- `npm run db:start` uruchamia lokalną bazę i Auth,
- `npm run dev` uruchamia aplikację,
- lokalne dane pozostają w wolumenach Dockera,
- aplikacja nie kontaktuje się z produkcyjnym Supabase,
- `npm run collect` nadal wymaga internetu.

Pełna reinstalacja zależności lub pierwsze pobranie obrazów Dockera wymaga sieci. Zwykłe kodowanie, uruchamianie aplikacji, migracje działają offline.

## Zaimplementowane etapy 2–6

- Klient SSR używa ciasteczek; `src/proxy.ts` odświeża sesję i przekazuje nowe ciasteczka do renderowania i przeglądarki. Trasy oraz każda akcja ponownie weryfikują użytkownika. Dane czytamy klientem z kluczem publicznym z obowiązującym RLS.
- Zwykłe operacje nie używają klucza sekretnego. `scripts/supabase.ts` tworzy klienta z kluczem serwerowym wyłącznie dla procesów importu wydarzeń i wyników. Nie zarządza kontami użytkowników.
- Import synchronizuje metadane drużyn i opcjonalne herby, a wszystkie wydarzenia dokumentu zapisuje pojedynczym upsertem. Dane opisowe i kursy mogą się zmieniać; trigger chroni status i wynik już rozliczonego wydarzenia przed cofnięciem przez kolejny import.
- `save_coupon` w jednej transakcji sprawdza właściciela, edytowalny status, unikalność wydarzeń i dostępność nowych lub zmienianych typów. Zmiany pozycji zapisują się automatycznie, stawka po krótkiej przerwie we wpisywaniu; zapisy jednego kuponu są kolejkowane, aby zachować kolejność i identyfikator nowego kuponu. Pusty kupon ma status draft, niepusty placed i od razu podlega rozliczeniu. Rozpoczętych pozycji nie można zmieniać ani usuwać. Pozycja zachowuje kurs wyświetlony w momencie dodania. Przy edycji tego samego typu SQL zachowuje wcześniej zapisany kurs niezależnie od danych nadesłanych przez interfejs. Bezpośredni INSERT/UPDATE kuponów oraz mutacje pozycji są odebrane roli authenticated; pozostają odczyt przez RLS i usuwanie własnego kuponu.
- `clear_coupon` w transakcji sprawdza właściciela i blokuje kupon przed usunięciem wszystkich jego pozycji; resetuje status do draft i kurs do 1, zachowując stawkę. Jawne wyczyszczenie obejmuje także rozpoczęte wydarzenia. Czyszczenie i usuwanie boksu czekają w tej samej kolejce co zapis, więc nie ścigają się z rozpoczętym zapisem.
- `settle_event` zapisuje status i regulaminowy wynik wydarzenia, blokując wyłącznie to wydarzenie. Po aktualizacji wydarzeń `refreshResults` zawsze wywołuje `settle_coupons`, także bez nowych wyników oraz przy częściowych błędach pobierania. Obie funkcje są dostępne wyłącznie roli service_role.
- `settle_coupons` blokuje niepuste, nierozliczone kupony w stabilnej kolejności i w jednej transakcji rozlicza ich oczekujące pozycje z wyników zapisanych w `events`, a następnie całe kupony. Uwzględnia też wydarzenia rozliczone podczas wcześniejszych importów. Dopóki istnieje pending, status pozostaje placed, nawet jeśli inna pozycja jest lost. Gdy wszystkie pozycje są rozliczone: lost przy dowolnej przegranej, won przy przynajmniej jednej wygranej bez przegranych, void przy samych zwrotach; wtedy ustawiamy `settled_at`. Puste kupony pozostają draft. Ponowienie nie zmienia utrwalonych wyników ani czasu zakończenia.
- Widok meczów odczytuje tylko draft/placed z `settled_at IS NULL`. „Moje kupony” pokazują wszystkie kupony i wynik każdej pozycji. Kupon z przegraną pozycją ma potencjalną wygraną 0, nawet gdy czeka na pozostałe wyniki.
- Anulowanie daje zwrot z efektywnym kursem 1; przełożenie i brak jednoznacznego wyniku pozostają oczekujące. Wynik pochodzi z regulaminowego czasu, bez dogrywki i karnych. Niejednoznaczny wynik nie jest zgadywany.
- `scripts/results.ts` odczytuje stronicami nierozliczone wydarzenia z dni do dzisiaj przed rozpoczęciem aktualizacji. Grupuje je po dniu w Europe/Warsaw i używa wyłącznie stronicowanej listy `/matches-by-competition/all`. Jeden dzień jest pobierany raz w obrębie uruchomienia, a wyniki dopasowywane po zewnętrznym ID. Domyślnie sprawdza też dzisiejszą listę, aby odnaleźć mecze przeniesione z wcześniejszych dni; `TARGET_DATE` ogranicza pracę do jednego dnia. Brak meczu na sprawdzanych listach pozostawia go oczekującym, bez zgadywania nowego terminu. Przyszłe dni są pomijane. Błędy częściowe są rejestrowane z licznikami postępu, a kolejne uruchomienie podejmie brakujące wydarzenia.
- Dzień i jego granice wyznaczamy w Europe/Warsaw, również w dniach zmiany czasu. Odczyt wydarzeń i kuponów jest stronicowany, aby limit odpowiedzi API bazy nie obcinał listy.

Automatyzacja, wdrożenie i utrzymanie z etapów 7–8 pozostają poza zakresem tej implementacji.

## Preferencje i tłumaczenia

Języki `pl` i `en` mają słowniki JSON z wspólnymi, sprawdzanymi przez TypeScript kluczami. `getI18n()` odczytuje język na serwerze; `useI18n()` udostępnia ten sam zestaw tekstów oraz formatowanie w komponentach klienckich. Akcje formularzy zwracają klucze komunikatów, dzięki czemu błąd i potwierdzenie są wyświetlane w aktywnym języku.

Chroniony ekran `/settings` zapisuje język i motyw w ciasteczkach `nico-locale` oraz `nico-theme` na rok, dla tej przeglądarki. Root layout odczytuje je przed renderowaniem, ustawia język HTML oraz atrybut motywu i przekazuje preferencje do kontekstu React. Wybór nie wymaga zmian schematu bazy i pozostaje aktywny na ekranie logowania. Oba motywy korzystają ze wspólnych semantycznych zmiennych CSS.

Na życzenie właściciela usunięto testy automatyczne i runner. Bieżąca kontrola jakości obejmuje ESLint, TypeScript, Prettier, build i ręczne sprawdzanie interfejsu.

## Rejestracja i środowisko developerskie

`/register` wywołuje `auth.signUp()` klientem z kluczem publicznym i sesją w ciasteczkach. Lokalne Auth ma włączoną rejestrację i wyłączone potwierdzanie e-maila; po założeniu konta użytkownik przechodzi do aplikacji. Przy serwerze wymagającym potwierdzenia adresu formularz pokazuje komunikat, a `/auth/callback` wymienia kod PKCE na sesję. Proxy dopuszcza niezalogowanych do `/login`, `/register` i callbacka; reszta aplikacji wymaga sesji.

Zmiana na wielu użytkowników nie wymaga migracji: Auth przechowuje konta, `coupons.user_id` określa właściciela kuponu, a RLS i funkcja `save_coupon` sprawdzają bieżącego użytkownika. Istniejące konta i dane pozostają zachowane.

Cały lokalny Supabase jest uruchamiany w kontenerach Dockera przez CLI. Konfiguracja i migracje pozostają w repozytorium; dane są w wolumenach Dockera. Next.js i procesy `tsx` korzystają z aliasów `@lib/*`, `@components/*` i `@app/*` z `tsconfig.json`, wskazujących odpowiednio `src/lib/*`, `src/components/*` i `src/app/*`.

## Kolejność rozgrywek

Importer nadal pobiera wszystkie mecze. `src/lib/competitions.ts` ustala kolejność listy: ligi poziomu 1–2 oraz puchary Polski, Anglii, Niemiec, Francji, Hiszpanii, Portugalii, Holandii, Belgii, Turcji, Włoch, Szkocji, Austrii i Szwajcarii są przed resztą. Dopasowanie kraju używa sluga i nazwy z API, z aliasami polskimi i angielskimi. W obu grupach sortujemy po `competition_display_order` z API i nazwie. Brak kraju/poziomu nie usuwa meczu z listy; pozostawia go w pozostałych rozgrywkach. Poziomu ligi nie przypisujemy pucharom na podstawie ligi uczestników.

## Statystyki kuponów

Chroniony widok `/statistics` odczytuje stronicami wyłącznie potrzebne kolumny własnych kuponów i ich pozycji, z publicznym klientem SSR i RLS. Nie pobiera JSON-owych statystyk meczów ani danych Meczyków. `src/lib/statistics.ts` agreguje finanse w groszach oraz wyniki pozycji według typu, utrwalonego kursu i ID rozgrywek. Bilans uwzględnia tylko kupony z końcowym statusem i `settled_at`, przy zachowaniu osobnej sumy oczekujących stawek. Wygrane to wypłata brutto, zwrot oddaje stawkę, przegrana daje wypłatę 0. Kupony bez stawki są pomijane wyłącznie w finansach.

Historia bilansu jest kumulowana według lokalnego dnia rozliczenia. `statistics-charts.tsx` renderuje interaktywny wykres SVG i słupki HTML z przełącznikiem typy/kursy/rozgrywki, dostępne również z klawiatury i czytnika ekranu. Trafność wyłącza void/pending z mianownika i pokazuje rozmiar próby. Dane są przekazywane jako agregaty; wykresy nie potrzebują dodatkowych bibliotek, dostępu do internetu ani klucza serwerowego. Statystyki opisują przechowywane kupony; usunięcie kuponu usuwa także jego udział w zestawieniu.

## Tożsamość drużyn i lokalne herby

`teams` identyfikuje drużynę unikalną parą provider + external_id (`participant.id` Meczyków) i wewnętrznym UUID. Nazwy nie służą do dopasowywania. Migracja `202610310001_teams_and_logos.sql` wypełnia tabelę z istniejących `statistics.home/away.participant_id` i uzupełnia klucze obce wydarzeń, zachowując wszystkie powiązania kuponów.

Herb 50 px jest pobierany z publicznego CDN po ID uczestnika. Lokalna kopia WebP (zwykle około 1 KB, limit 64 KiB) znajduje się w jednej kolumnie bytea przy drużynie; źródłowy link, SHA-256 i data sprawdzenia są osobnymi polami. Nie wymaga to włączenia Supabase Storage. Obecność hasha pomija pobieranie i zapis. HTTP 404 ma tygodniowy cache, błędy sieciowe nie blokują importu wydarzeń. Wspólna bramka zapytań zachowuje limit częstotliwości i retry klienta. Aktualizacje binariów są warunkowe na brak hasha, więc równoległe importy nie tworzą duplikatów.

Aplikacja odczytuje hashe przez relacje teams, bez przesyłania binariów z całą listą wydarzeń. Chroniony Route Handler `/api/teams/[id]/logo` zwraca WebP z lokalnego PostgreSQL, używając klienta sesyjnego i RLS, z ETag oraz prywatnym cache. Komponent wyświetla dekoracyjny herb obok nazwy i ukrywa błędny obraz. Żaden odczyt ekranu nie wymaga kontaktu z CDN. Zapisy teams są dostępne wyłącznie procesom importu z kluczem serwerowym; zalogowani użytkownicy mają odczyt.

`npm run teams:sync` uzupełnia brakujące herby wszystkich zapisanych drużyn. Nowe importy `collect` robią to automatycznie dla uczestników pobranych meczów; eksporty JSON zawierają zewnętrzne ID i linki źródłowe.

## Wyniki na żywo i proces cykliczny

Migracja `202610310002_live_results.sql` dodaje do events osobne live_home_score/live_away_score, match_minute, match_phase i result_checked_at. Service-role RPC `record_match_result` zapisuje migawkę i dotychczasowy końcowy wynik regulaminowy. Stan live nie ustawia settled_at i nie zapisuje końcowych goli; dopiero finished z jednoznacznym wynikiem uruchamia dotychczasowe rozliczanie. Trigger chroni także migawkę zakończonego wydarzenia przed importem opisowym.

`results` i ręcznie uruchamiane `results:watch` współdzielą pojedynczy przebieg z results-run.ts. Pętla zaczyna od razu, a po zakończeniu każdego przebiegu losuje kolejną przerwę 5–10 pełnych minut. Nie nakłada przebiegów; losowanie dotyczy przerwy między importami, a nie opóźnień poszczególnych zapytań API. Błąd jednego przebiegu nie kończy kolejnych. SIGINT/SIGTERM przerywa oczekiwanie i pozwala dokończyć aktywny przebieg; nie ma rejestracji systemowego harmonogramu ani autostartu.

Chronione POST `/api/results` odczytuje przez klienta sesyjnego i RLS wyłącznie małe migawki wskazanych wydarzeń i własnych kuponów. Widoki odczytują je co minutę, partiami do 250 ID, z blokadą nakładania odczytów, anulowaniem przy zmianie widoku i wstrzymaniem w ukrytej karcie. API nie wykonuje importu. Aktualizacje scalają tylko statusy, wyniki i rezultaty pozycji, zachowując lokalne wybory i stawkę; nie zwiększają wersji edycji ani nie uruchamiają autosave. Powiązanie zapisanych UUID nowych kuponów pozwala usuwać zakończone boksy bez odświeżania całej strony. Widok Moje kupony odświeża wyniki pozycji, stan kuponu i dostępność edycji. Przeglądarka nie symuluje minuty i nie kontaktuje się z Meczykami.

## Prezentacja kuponów i stanów live

`SavedCoupon` odczytuje wspólną migawkę wyników i pokazuje datę, ikonowe akcje oraz ikonę wyniku całego kuponu. Lista pozycji jest sortowana po kickoff; wyniki są między drużynami, termin w chipsie obok, a stan pozycji po prawej. `result-status.ts` wyznacza tylko prezentacyjny stan live-won/live-lost z aktualnego wyniku regulaminowego (z wyłączeniem dogrywki/karnych); stan w bazie i rozliczanie pozostają niezależne. Ikony tymczasowe mają przerywaną obwódkę oraz zegar. `ResultIcon` zapewnia tooltip i etykietę dostępną bez polegania wyłącznie na kolorze.

Nagłówek kuponu nie powtarza nazwy kuponu; podsumowanie pokazuje także potencjalną wygraną i korzysta z aktualnych wyników pozycji oraz kursu z migawki. Na wydarzeniach `MatchClock` zastępuje godzinę minutą live. MatchTeam korzysta ze wspólnych wierszy grid/subgrid dla nazw, danych tabeli i formy, a chipsy tabeli są renderowane tylko przy competition_type=league. Czas pobrania nadal jest zapisany w bazie, ale interfejs nie pokazuje „Sprawdzono”.
