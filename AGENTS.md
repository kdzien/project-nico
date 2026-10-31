# Project Nico — informacje dla agentów

## Cel projektu

Project Nico to aplikacja webowa pomagająca przeglądać wydarzenia piłkarskie, układać kupony i później automatycznie rozliczać ich wyniki. Stos technologiczny to Next.js, TypeScript, React i Supabase/PostgreSQL. Importer danych Meczyki pozostaje osobnym procesem w tym samym repozytorium.

Źródłem prawdy dla planu jest `docs/IMPLEMENTATION_PLAN.md`, a decyzje architektoniczne znajdują się w `docs/ARCHITECTURE.md`. Realizuj etapy po kolei i aktualizuj status planu po zakończeniu etapu.

## Decyzje produktowe

- Aplikacja obsługuje wielu użytkowników. Każdy może samodzielnie założyć konto.
- Rejestracja i logowanie: e-mail i hasło przez Supabase Auth. Publiczna rejestracja jest włączona; nie twórz osobnej roli administratora ani skryptów zakładających konta.
- Pobieramy wszystkie dostępne wydarzenia i filtrujemy je w interfejsie.
- Kursy są poglądowe. Nie pokazuj i nie zapisuj nazwy bukmachera.
- Kupony zachowują kurs z chwili dodania pozycji. Pierwszy typ automatycznie tworzy kupon, kolejne zmiany zapisują się bez przycisków zapisu i zamknięcia. Niepuste kupony od razu podlegają rozliczaniu.
- Nad listą boksów kuponów pokazuj łączne stawki i sumę potencjalnych wygranych ze wszystkich niepustych kuponów, aktualizowane na bieżąco. Puste kupony nie wchodzą do podsumowania.
- Na ekranie wydarzeń może być wiele prostych boksów kuponów. Kliknięcie boksu wybiera aktywny kupon, a „Dodaj kolejny kupon” tworzy i wybiera pusty. Pusty kupon pozostaje zapisany. Nie pokazuj licznika pozycji nad listą; pusty kupon wyświetla „Brak wybranych wydarzeń”. Pod pozycjami są mały kurs łączny, stawka i potencjalna wygrana. Rozpoczętych pozycji nie można pojedynczo zmieniać ani usuwać. Przycisk „Wyczyść” usuwa wszystkie pozycje kuponu (również rozpoczęte), zachowując stawkę. Cały boks można usunąć, jeśli widoczny jest więcej niż jeden kupon; po usunięciu aktywnego wybierz pozostały.
- `npm run results` pobiera i zapisuje wyniki, a następnie uruchamia `settle_coupons`: pozycje otrzymują własny wynik won/lost/void. Dopóki choć jedna pozycja jest pending, kupon ma status placed i pozostaje na widoku meczów. Dopiero po rozliczeniu wszystkich pozycji otrzymuje końcowy status i `settled_at`; wtedy widać go wyłącznie w „Moich kuponach”. Choćby jedna przegrana daje końcowo lost; brak przegranych i przynajmniej jedna wygrana daje won; same zwroty dają void. Puste kupony pozostają draft.
- Nie dodawaj automatycznego obstawiania ani integracji wykonującej zakłady.

## Struktura repozytorium

- `src/app` — aplikacja Next.js i routing.
- `src/lib/collector` — klient zewnętrznego API i logika importu.
- `scripts` — uruchamialne procesy importu i narzędzia developerskie.
- `supabase/migrations` — wersjonowany schemat bazy oraz RLS.
- `docs` — architektura i plan implementacji.
- `outputs` — lokalne, ignorowane wyniki diagnostyczne JSON.

Supabase działa w Dockerze. Katalog `supabase` zawiera wyłącznie konfigurację i migracje; kontenery oraz wolumeny z danymi są zarządzane przez Docker. Polecenia Supabase CLI uruchamiają ten zestaw kontenerów.

## Uruchamianie i kontrola jakości

- Jednorazowa instalacja: `npm install`
- Jednorazowy setup lokalnej bazy i env: `npm run local:setup`
- Kolejne uruchomienie bazy: `npm run db:start`
- Aplikacja: `npm run dev`
- Panel lokalnego Supabase: `http://127.0.0.1:55323`
- Zatrzymanie bazy: `npm run db:stop`
- Reset bazy i ponowne migracje: `npm run db:reset`
- Pobranie meczów do JSON-a: `npm run collect`
- Rozliczenie wyników: `npm run results`
- Ciągła aktualizacja w losowych odstępach 5–10 minut: `npm run results:watch` (uruchamia właściciel; agent nie uruchamia tej pętli ani nie instaluje autostartu)
- Uzupełnienie brakujących herbów zapisanych drużyn: `npm run teams:sync` (bez ponownego importu meczów)
- Test jednego meczu: `TARGET_DATE=2026-10-27 MAX_MATCHES=1 npm run collect`
- Kontrola jakości: `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run build`
- Domyślna strefa czasu: `Europe/Warsaw`
- Pliki wynikowe: `outputs/matches-YYYY-MM-DD.json`

## Development offline

Po jednorazowym `npm install` i pierwszym `npm run local:setup` aplikacja, lokalna baza, Auth i migracje mają działać bez internetu. Supabase dla tego projektu używa portów `55320–55329`, ponieważ standardowe porty zajmuje inny projekt. Nie zatrzymuj ani nie modyfikuj kontenerów innych projektów.

Importer jest wyjątkiem i wymaga internetu. Kod aplikacji nie może uzależniać zwykłego lokalnego uruchomienia od dostępności Meczyki ani produkcyjnego Supabase. `.env.local` jest generowany przez `npm run env:local`, nie trafia do repozytorium i zawiera wyłącznie dane lokalnego Supabase.

W widoku „Moje kupony” sortuj pozycje każdego kuponu rosnąco po events.kickoff, z ID pozycji jako rozstrzygnięciem remisu. Nie pokazuj nazwy/tytułu kuponu. W nagłówku są data utworzenia, ikonowe akcje edycji/usunięcia i ikona stanu kuponu. Obok kursu i stawki pokazuj potencjalną wygraną. Wynik każdego wydarzenia jest między drużynami, a czas live w chipsie bezpośrednio obok wyniku. Termin i typ z kursem są sąsiadującymi chipsami (typ i kurs po prawej od daty).

Stan pozycji i kuponu pokazuj ikoną: nierozstrzygnięty — szaro-żółte koło z zegarem; won — zielone koło z ptaszkiem; lost — czerwone koło z krzyżykiem; void — neutralny minus. Stany live-won/live-lost mają przerywaną obwódkę i mały zegar, z opisem dostępnym dla czytnika i tooltipem. Wynik przy lost/live-lost pokazuj na czerwono wyłącznie w trakcie meczu; po zakończeniu wynik jest neutralny. Gdy choć jedna pozycja ma końcowy wynik lost, ikona całego kuponu jest pełna lost, bez przerywanej obwódki, nawet jeśli inne wydarzenia jeszcze czekają. Nie zmienia to momentu końcowego rozliczenia ani widoczności kuponu. Czas live po 80. minucie również jest czerwony (uwzględniaj doliczony czas, np. 80+1). Ocena live jest wyłącznie prezentacją, nie zapisuje wyniku ani nie rozlicza kuponu. Nie oceniaj rynku regulaminowego na podstawie bieżącego wyniku dogrywki/karnych.

## Statystyki użytkownika

- `/statistics` pokazuje finanse i historyczną skuteczność wyłącznie własnych zapisanych kuponów, z odczytem przez RLS.
- Łączne stawki obejmują niepuste kupony inne niż draft; wygrane to wypłaty brutto (stawka × utrwalony kurs) z wygranych kuponów. Zwroty pokazuj osobno.
- Bilans = wygrane + zwroty − stawki rozliczonych kuponów. Stawki oczekujące pokazuj osobno; kupony bez stawki nie wchodzą do kwot, ale ich pozycje wchodzą do skuteczności.
- Kwoty sumuj po zaokrągleniu pojedynczej wypłaty do groszy. Historię bilansu grupuj po dniu rozliczenia w Europe/Warsaw.
- Trafność = won / (won + lost); void i pending wyłącz z mianownika. Zawsze pokazuj liczbę prób obok procentu. Grupowanie: typ, kurs zapisany na pozycji, rozgrywki. Rozgrywki grupuj po ID, awaryjnie kraju i nazwie; na wykresie do 10 z największą liczbą rozliczonych pozycji.
- Wykresy opisują historię, bez prognoz i rekomendacji zakładów. Nie dodawaj zewnętrznych usług ani zależności wymagających internetu do wyświetlenia statystyk. Usunięte kupony nie są odtwarzane w statystykach.

## Model danych

- `teams` — stała tożsamość drużyny: wewnętrzne UUID i unikalna para `(provider, external_id)` z `participant.id`. Nazwa nie służy do dopasowania. Jeden mały herb WebP w `logo_data` na drużynę, z hashem i czasem sprawdzenia.
- Wynik live jest niezależny od wyniku końcowego: `live_home_score`, `live_away_score`, `match_minute`, `match_phase`, `result_checked_at`. Minuta jest migawką z API, bez symulowania zegara w przeglądarce.
- `events` — jedna tabela wydarzeń; pola filtrowalne są kolumnami, a `odds` i `statistics` to JSONB. Metadane rozgrywek zapisujemy w `competition_id`, `competition_slug`, `competition_type`, `competition_level`, `competition_display_order`, `country_id`, `country` i `country_slug`; brakujące dane pozostają null.
- `coupons` — kupony użytkowników; każdy ma dostęp tylko do swoich.
- `coupon_items` — typ, `odds_at_add` oraz niezależny wynik pozycji.
- `import_runs` — historia i błędy importów wydarzeń oraz wyników.

Tabela `teams` istnieje od 2026-10-31 dla stabilnych ID i deduplikacji herbów. Wydarzenia wskazują drużyny przez `home_team_id` / `away_team_id`; nazwy nadal są zapisane przy wydarzeniu. Nie twórz tabel rozgrywek ani kolejnych słowników bez nowej potrzeby produktowej. Nie zapisuj całych kuponów jako JSON. Każda zmiana schematu powstaje jako nowa migracja; nie edytuj migracji użytej już na produkcji.

RLS jest obowiązkowe dla każdej tabeli wystawionej przez API. Klucz sekretny Supabase może występować tylko w kodzie serwerowym i procesach importu, nigdy w komponencie klienckim ani zmiennej `NEXT_PUBLIC_*`.

## API Meczyki

Bazowy URL używany przez klienta:

`https://api.meczyki.pl/api/v2/soccer`

To API nie jest częścią tego projektu i może zmienić format lub ograniczenia bez uprzedzenia. Nie omijaj zabezpieczeń serwisu. Zachowaj ograniczanie częstotliwości zapytań, retry dla HTTP 429 i błędów 5xx oraz cache w obrębie jednego uruchomienia.

### 1. Lista meczów na dzień

`GET /matches-by-competition/all?day={YYYY-MM-DD}&page={PAGE}&matches_per_page={LIMIT}`

Przykład:

`/matches-by-competition/all?day=2026-10-27&page=1&matches_per_page=20`

Parametry:

- `day` — dzień spotkań w formacie `YYYY-MM-DD`.
- `page` — numer strony od 1.
- `matches_per_page` — liczba rekordów na stronie.

Odpowiedź listy zwraca obecnie mecze w `data.matches` oraz flagę `data.hasLiveMatches`; klient akceptuje też starszy format `data` będący tablicą. Nieprawidłowy format powoduje błąd, a nie uznanie listy za pustą. Skrypt pobiera kolejne strony aż do otrzymania strony krótszej niż `matches_per_page`. Z tego endpointu pochodzą:

- `match_id` z `id`,
- `kickoff` z `startTime`,
- nazwa rozgrywek z `competition.displayName`,
- ID i slug rozgrywek z `competition.id` / `competition.slug`,
- rodzaj rozgrywek z `competition.type` (np. league/cup), poziom z `competition.countryGameLevel`, kolejność z `competition.displayOrder`,
- kraj: ID, nazwa i slug z `competition.country`; nie używaj ligi gospodarza jako poziomu pucharu,
- runda z `bracketRound.displayName`,
- identyfikatory i nazwy gospodarza oraz gościa,
- `participant.slug`, `participant.country.displayName` i `participant.hasFetchedImage`, używane przy zapisie drużyn oraz pobieraniu herbów,
- `normalizedSeason`, potrzebny do pobrania tabeli,
- identyfikatory krajowych rozgrywek drużyn z `participant.competition.id`.

### 2. Kursy bukmacherskie

`GET /bookie-match-odds?matchItem[]={MATCH_ID}`

Przykład:

`/bookie-match-odds?matchItem%5B%5D=6187558`

`MATCH_ID` pochodzi z endpointu listy meczów. Odpowiedź zawiera kursy wielu bukmacherów. Skrypt wybiera pierwszy rekord zawierający kompletny, poprawny zestaw `1`, `X`, `2`. Nazwa źródła nie jest zapisywana. Z jednego wybranego rekordu zapisuje:

- `odds.1` z `homeOdds`,
- `odds.X` z `tieOdds`,
- `odds.2` z `awayOdds`.

API nie zwraca używanych przez projekt kursów podwójnej szansy, dlatego są obliczane z kursów tego samego bukmachera:

- `1X = 1 / (1 / odds1 + 1 / oddsX)`,
- `2X = 1 / (1 / odds2 + 1 / oddsX)`.

Wyniki są zaokrąglane do dwóch miejsc. Jeśli kompletny zestaw nie występuje, pola kursów otrzymują `null`.

### 3. Ostatnie mecze drużyny

`GET /participants/{PARTICIPANT_ID}/matches?lastMatchStartTime={YYYY-MM-DD}&future=0`

Przykład:

`/participants/11382/matches?lastMatchStartTime=2026-10-27&future=0`

`PARTICIPANT_ID` pochodzi z danych gospodarza lub gościa w endpointcie listy meczów. Parametr `future=0` wybiera historię, a `lastMatchStartTime` ustawia granicę czasową. Endpoint obecnie zwraca 10 spotkań. Skrypt nie nakłada własnego limitu: odrzuca tylko pozycje bez statusu `finished` i zapisuje wszystkie pozostałe jako:

- `home.last_matches`,
- `away.last_matches`.

Dla każdego spotkania zapisywane są: ID, data, rozgrywki, gospodarz, gość i wynik. Odpowiedzi są cache'owane po `PARTICIPANT_ID` w obrębie jednego uruchomienia.

### 4. Tabela ligowa

`GET /competitions/{COMPETITION_ID}/live-standings/{SEASON}`

Przykład:

`/competitions/7/live-standings/2026`

`COMPETITION_ID` pochodzi z `homeParticipant.competition.id` lub `awayParticipant.competition.id`, a `SEASON` z `normalizedSeason` meczu. Z tego endpointu pochodzą:

- `home.table.position` i `away.table.position`,
- `home.table.points` i `away.table.points`.

Pozycja jest odczytywana najpierw z `displayOrder`, a awaryjnie z `participant.competitionPosition`. Tabele są cache'owane po parze `COMPETITION_ID:SEASON` w obrębie jednego uruchomienia. Dla pucharów lub rozgrywek bez tabeli wartość może być `null`.

### 5. Mecze bezpośrednie H2H

`GET /matches/head-to-head/{HOME_PARTICIPANT_ID}/{AWAY_PARTICIPANT_ID}`

Przykład:

`/matches/head-to-head/2021/2022`

Oba identyfikatory pochodzą z endpointu listy meczów. Endpoint obecnie zwraca 10 spotkań. Skrypt nie nakłada własnego limitu, filtruje jedynie spotkania zakończone i zapisuje je w `h2h.last_matches`.

Na podstawie całej zwróconej, zakończonej historii skrypt oblicza także `h2h.summary`: liczbę spotkań, zwycięstwa obecnego gospodarza, remisy, zwycięstwa obecnego gościa oraz gole obu stron. Przy obliczeniach uwzględnia, że w historycznym meczu drużyny mogły występować w odwrotnych rolach.

### 6. Aktualizacja wyników z listy meczów

Proces `npm run results` używa wyłącznie endpointu z punktu 1: `GET /matches-by-competition/all?day={YYYY-MM-DD}&page={PAGE}&matches_per_page={LIMIT}`. Wybiera nierozliczone wydarzenia z bazy z dni do dzisiaj w Europe/Warsaw, grupuje je po dniu i pobiera wszystkie strony dla każdego dnia. Domyślnie sprawdza również dzisiejszą listę, aby znaleźć przełożone spotkania. `TARGET_DATE=YYYY-MM-DD npm run results` ogranicza kandydatów i pobieranie do jednej daty. Przyszłe dni są pomijane.

Dopasowanie odbywa się po `id` równym `events.external_id`, tylko dla istniejących wydarzeń dostawcy Meczyki. `homeScore` / `awayScore` zapisują migawkę wyniku live, `minute` minutę (także zapis typu 90+3), a surowy `status` fazę meczu. `startTime` aktualizuje termin, a `status` stan spotkania (`not_started` → `scheduled`, stany połówek → `live`, `finished`, `postponed`, `cancelled`). Nieznany status i brak meczu na pobranych listach nie powodują anulowania ani rozliczenia. Przy przełożeniu na inny dzień, którego listy nie pobieramy, mecz pozostaje oczekujący do pojawienia się na sprawdzanej liście.

W odpowiedzi listy `attributes` zawiera wynik regulaminowy w pozycjach o `type` równym `home_regular_time_score` i `away_regular_time_score`; `value` jest liczbą lub ciągiem liczbowym. Nie używamy dogrywki ani karnych. Przy braku tych atrybutów ogólny `homeScore` / `awayScore` jest jednoznaczny wyłącznie przy jawnym `withOvertime: false`. Pełny, poprawny wynik ze statusem `finished` jest zapisywany jako wynik końcowy. Po aktualizacji wydarzeń `settle_coupons` rozlicza wszystkie oczekujące pozycje na podstawie wyników w bazie, także zapisanych podczas wcześniejszych uruchomień; działa również przy braku nowych wydarzeń lub częściowym błędzie pobrania. Anulowanie daje zwrot; przełożenie i niepełny wynik pozostawiają pozycje oczekujące. Wyniki nie wymagają zapytań do endpointów kursów, statystyk ani szczegółów meczu.

## Cykliczne wyniki i odczyt na żywo

- `npm run results:watch` wykonuje pierwszy przebieg od razu. Po zakończeniu każdego przebiegu losuje nową przerwę 5–10 pełnych minut. Uruchomienia są sekwencyjne; błędy są logowane, a następny przebieg nadal działa. Ctrl+C/SIGTERM kończy oczekiwanie i pozwala dokończyć trwający import. Nie uruchamiaj tej pętli za właściciela.
- `scripts/results-run.ts` zawiera wspólny pojedynczy przebieg dla `results` i `results:watch`; data Europe/Warsaw jest wyznaczana od nowa w każdym przebiegu. TARGET_DATE przypina konkretny dzień, jeśli go podano.
- `record_match_result` zapisuje status, bieżący wynik, fazę, minutę i czas sprawdzenia. Końcowy wynik regulaminowy w home_score/away_score zapisuje tylko dla finished; rozliczanie kuponów pozostaje osobnym krokiem po imporcie.
- Na kartach wydarzeń i pozycjach kuponów pokazuj wynik oraz przy live etykietę „Trwa”, minutę z API (jeśli dostępna). Nie pokazuj tekstu „Sprawdzono” ani godziny sprawdzenia; result_checked_at pozostaje wyłącznie metadanymi. Na wydarzeniu minuta live zastępuje godzinę rozpoczęcia. Przerwę i karne rozróżniaj etykietą; brakującej minuty nie zgaduj.
- UI co minutę odczytuje tylko małe migawki wyników przez chronione POST `/api/results`, z RLS. Nie odpytuje Meczyków. Odświeżanie wstrzymuje się w ukrytej karcie i wznawia po powrocie, bez nakładających się odczytów.
- Aktualizacja wyników nie zmienia wersji edycji kuponu ani nie wywołuje ponownego zapisu typów/stawki. Zapisany ID nowego kuponu jest wiązany z lokalnym boksem. Po końcowym rozliczeniu boks znika automatycznie, a gdy nie ma innych, pojawia się nowy pusty kupon.

## Drużyny i herby

- `participant.id` jest ID zewnętrznym drużyny; `teams.id` jest wewnętrznym UUID. Nigdy nie łącz drużyn po nazwie.
- Publiczny CDN Meczyków udostępnia herb 50 px pod `https://pliki.meczyki.pl/live-score/soccer/participant/{ID}/50w.webp`. Importer zapisuje link w JSON i lokalną kopię w tabeli teams (maks. 64 KiB, walidacja sygnatury WebP; CDN może zwracać application/octet-stream).
- Zapis istniejącego herbu rozpoznaj po `logo_hash` i pomijaj pobieranie. Brakujące herby z HTTP 404 sprawdzaj ponownie po 7 dniach. Zachowaj wspólne opóźnienie zapytań i retry dla 429/5xx. Błąd pojedynczego herbu nie blokuje zapisu meczów.
- `SupabaseRepository` zapisuje metadane drużyn i uzupełnia herby przed atomowym upsertem wydarzeń. `JsonRepository` pozostaje niezależne od bazy; JSON zawiera zewnętrzne ID i linki, bez binarnych herbów.
- UI pobiera tylko hashe przez relacje teams; binaria są dostępne przez chronione `/api/teams/{UUID}/logo`. Używaj lokalnych adresów, aby herby działały offline. Nie włączaj Storage ani nie kopiuj tych samych binariów do każdego wydarzenia. Herby pokazuj przy nazwach na kartach meczów oraz kuponach. Bez herbu nazwa drużyny nadal jest widoczna.
- Migracja uzupełnia teams i relacje dotychczasowych wydarzeń z ID zapisanych w statistics, bez zmiany ID wydarzeń i pozycji kuponów.

## Przepływ danych

1. Lista meczów dostarcza ID spotkania, drużyn, rozgrywek i sezonu.
2. Dla każdego meczu pobierane są równolegle kursy, obie historie drużyn, H2H i potrzebne tabele.
3. Dane są normalizowane do typów z `src/lib/collector/types.ts`.
4. Domyślny `SupabaseRepository` najpierw synchronizuje drużyny/herby, a wydarzenia zapisuje pojedynczym upsertem; opcjonalny `JsonRepository` zapisuje JSON atomowo. Import działa dla bieżącego dnia Europe/Warsaw, o ile nie podano TARGET_DATE.

## Styl kodu i ustawienia interfejsu

- Nie pisz testów i nie przywracaj usuniętych testów ani konfiguracji runnera. Weryfikuj przez lint, TypeScript, formatowanie i build.
- Ręczne sprawdzanie działania i wyglądu strony oraz debugowanie w przeglądarce wykonuje właściciel. Agent nie musi uruchamiać przeglądarki ani sprawdzać interfejsu, chyba że właściciel wyraźnie o to poprosi.
- Importy w `src` oraz importy z `src` w procesach używają aliasów `@lib/…`, `@components/…` i `@app/…` z `tsconfig.json` (odpowiednio `src/lib/*`, `src/components/*`, `src/app/*`). Lokalne helpery procesów i arkusze CSS mogą używać ścieżek względnych.
- Wcięcia: tabulatory o szerokości 4. Obowiązują `.editorconfig` i `.prettierrc.json`; uruchamiaj `npm run format`.
- JSX i zagnieżdżone struktury zapisuj czytelnie na osobnych liniach. Wszystkie warunki i pętle mają klamry; ESLint wymusza `curly: all`.
- Interfejs ma mieć krótkie, rzeczowe etykiety. Nie dodawaj sloganów, opisów powitalnych ani komunikatów technicznych o importach i orientacyjności kursów.
- Nad listą meczów są tylko data z natychmiastowym odświeżeniem oraz filtr warunków kursów (zakres i porównania, wiele warunków, wszystkie/dowolny). Nie przywracaj osobnego nagłówka „Mecze” ani filtrów ligi, drużyny i statusu.
- Kolejność rozgrywek: na górze Polska, Anglia, Niemcy, Francja, Hiszpania, Portugalia, Holandia, Belgia, Turcja, Włochy, Szkocja, Austria i Szwajcaria — tylko ligi poziomu 1–2 oraz puchary tych krajów. Pozostałe rozgrywki nadal są widoczne poniżej. W obu grupach wykorzystuj kolejność popularności `competition.displayOrder`, a potem nazwę. Dopasowanie krajów obsługuje polskie i angielskie nazwy/slugi. Nieznanego poziomu nie zgaduj z nazwy ligi.
- Karty meczów grupuj według ID rozgrywek (awaryjnie kraju i nazwy) i zachowuj kompaktowy układ. W nagłówku grupy pokazuj kraj, żeby rozróżnić jednakowe nazwy pucharów. Nazwy drużyn są po bokach, wynik pośrodku, pozycja i punkty w wyrównanym wierszu małych chipsów tylko dla competition_type=league, pod nazwami forma W/D/L, na dole kursy. Nie powtarzaj nazw ligi ani ról drużyn. Krótka etykieta live jest dozwolona, bez wiersza „Sprawdzono”. H2H jest na razie ukryte. Pokazuj całą zapisaną historię formy.
- Teksty interfejsu dodawaj do obu słowników `src/lib/i18n/messages/pl.json` i `en.json`. Nie wpisuj tekstów UI bezpośrednio w komponentach.
- Komponenty serwerowe używają `getI18n()`, klienckie `useI18n()`. Komunikaty zwracane przez akcje są kluczami tłumaczeń.
- Język i motyw wybiera się w `/settings`; są zapamiętywane w ciasteczkach tej przeglądarki. Domyślnie: polski i ciemny motyw. Root layout ustawia `lang` oraz `data-theme` przed renderowaniem UI.
- Kolory interfejsu pochodzą ze zmiennych CSS, z wartościami dla jasnego i ciemnego motywu. Daty nadal używają Europe/Warsaw, a waluta pozostaje PLN niezależnie od języka.

## Ważne zasady przy rozwijaniu projektu

- Nie przywracaj limitu pięciu spotkań; zapisuj wszystkie zakończone mecze zwrócone przez endpoint historii i H2H.
- Wszystkie kursy jednego wydarzenia muszą pochodzić z jednego kompletnego rekordu odpowiedzi. Nie utrwalaj nazwy bukmachera.
- Nie usuwaj opóźnienia pomiędzy zapytaniami ani obsługi retry.
- Przy zmianie formatu odpowiedzi API zaktualizuj równocześnie typy, mapowanie i ten dokument.
- Przy dodawaniu bazy danych zachowaj interfejs repozytorium i pozostaw pobieranie danych niezależne od sposobu zapisu.
- Po zmianie kodu uruchom przynajmniej lint i typecheck; przed zakończeniem etapu również format:check i build.
- UI i odczyt zapisanych danych muszą działać bez internetu przy uruchomionym lokalnym Supabase.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
