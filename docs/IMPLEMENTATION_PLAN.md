# Plan implementacji

Każdy etap kończy się działającym, możliwym do zweryfikowania fragmentem. Nie rozpoczynamy kolejnego etapu, dopóki lint, TypeScript, formatowanie i build bieżącego etapu nie przechodzą.

## Etap 1 — fundament projektu

Status: ukończony 2026-10-26.

- przebudowa repozytorium na Next.js,
- zachowanie istniejącego importera,
- lokalny Supabase w Dockerze,
- początkowa migracja bazy i RLS,
- dokumentacja architektury i pracy offline,
- weryfikacja builda, lintowania i typów.

Kryterium ukończenia: po jednorazowym setupie `npm run dev` i lokalna baza uruchamiają się bez internetu, a kolektor nadal może zapisać JSON po uzyskaniu sieci.

## Etap 2 — logowanie

Status: ukończony 2026-10-26. Zweryfikowano logowanie, odświeżanie, wylogowanie i RLS na lokalnej bazie.

- klient Supabase dla serwera i przeglądarki,
- logowanie e-mail/hasło,
- wylogowanie i odświeżanie sesji,
- ochrona tras aplikacji,
- publiczna rejestracja e-mail/hasło (zmiana założenia 2026-10-27),
- testy polityk RLS.

Kryterium ukończenia: użytkownik zakłada konto, loguje się i widzi chroniony ekran; inny użytkownik nie odczytuje jego kuponów.

## Etap 3 — zapis importu do bazy

Status: ukończony 2026-10-26. Test lokalnej bazy potwierdził upsert bez duplikatów i rejestrację błędów.

- `SupabaseRepository` zgodne z `CollectionRepository`,
- upsert wydarzeń po `(provider, external_id)`,
- wybór pierwszego kompletnego zestawu kursów bez zapisywania bukmachera,
- import dla bieżącego dnia w `Europe/Warsaw`,
- wpisy w `import_runs`,
- pozostawienie JSON-a jako opcjonalnego outputu,
- test mapowania odpowiedzi API na rekord bazy.

Kryterium ukończenia: ponowienie tego samego importu nie tworzy duplikatów, a błąd jest widoczny w `import_runs`.

## Etap 4 — lista wydarzeń

Status: ukończony 2026-10-26. Zweryfikowano listę, filtr i statystyki w przeglądarce na rzeczywistym imporcie.

- ekran dzisiejszych wydarzeń,
- sortowanie według godziny,
- data z natychmiastowym odświeżaniem i rozbudowane warunki kursów (zastępują filtry ligi, drużyny i statusu),
- kursy `1`, `X`, `2`, `1X`, `2X`,
- rozwijane tabele, forma i H2H,
- czytelne stany braku danych i nieudanego importu.

Kryterium ukończenia: użytkownik może sprawnie przejrzeć wszystkie mecze dnia na komputerze i telefonie.

## Etap 5 — budowanie kuponu

Status: ukończony 2026-10-26. Testy bazy potwierdziły atomowość, niezmienność kursów i autoryzację; zapis i odczyt sprawdzono w przeglądarce.

- wiele prostych kuponów na ekranie wydarzeń; kliknięcie boksu wybiera aktywny,
- jeden wybór na wydarzenie,
- automatyczny kurs łączny,
- automatyczny zapis po dodaniu pierwszego typu i kolejnych zmianach; bez przycisków zapisu i zamknięcia,
- stawka i potencjalna wygrana, przycisk dodania kolejnego kuponu,
- lista, edycja i usuwanie własnych kuponów,
- zapis `odds_at_add` dla każdej pozycji.

Kryterium ukończenia: zapisany kupon zachowuje swoje kursy nawet po zmianie kursów wydarzenia.

Aktualizacja 2026-10-28: automatycznie zapisywane kupony i wybór aktywnego boksu, puste kupony pozostają zapisane. Niepuste kupony są rozliczane od razu; migracja zachowuje dotychczasowe dane.

## Etap 6 — wyniki i rozliczanie

Status: ukończony 2026-10-26. Zweryfikowano wynik regulaminowy z rzeczywistego API, 14 testów jednostkowych oraz testy lokalnej bazy wszystkich typów, zwrotów, braku wyniku i równoległego ponowienia zadania. Lint, typecheck i build przechodzą.

- ponowne pobieranie niezakończonych wydarzeń,
- aktualizacja 2026-10-27: wyniki ze stronicowanej listy dni (`matches-by-competition/all`), bez osobnego zapytania o każdy mecz; opcjonalny `TARGET_DATE`,
- zapis wyniku regulaminowego czasu gry,
- rozliczanie `1`, `X`, `2`, `1X`, `2X`,
- status każdej pozycji i całego kuponu,
- bezpieczne ponawianie zadania,
- przypadki anulowania, przełożenia i braku wyniku.

Kryterium ukończenia: zakończone wydarzenia automatycznie aktualizują odpowiadające im pozycje i kupony.

## Etap 7 — automatyzacja i wdrożenie

- repozytorium GitHub,
- workflow importu około 10:00 czasu `Europe/Warsaw`,
- oddzielny workflow wyników,
- sekrety GitHub i Supabase,
- deploy Next.js na Vercel,
- ręczne wywołanie importu i kontrola błędów.

Kryterium ukończenia: aplikacja działa w chmurze bez ręcznego codziennego uruchamiania kolektora.

## Etap 8 — utrzymanie

- czyszczenie ciężkich statystyk starych, niewykorzystanych wydarzeń,
- zachowanie wydarzeń i kursów użytych w kuponach,
- obserwacja zajętości bazy,
- opcjonalna historia skuteczności i statystyki własnych typów.

## Zmiany ogólne — 2026-10-27

- usunięcie testów automatycznych, skryptów testowych i Vitesta na życzenie właściciela; wcześniejsze wzmianki o testach dokumentują weryfikację wykonaną przed ich usunięciem,
- tabulatory o szerokości 4, Prettier, EditorConfig i obowiązkowe klamry; czytelny zapis JSX,
- słowniki PL/EN w JSON z tłumaczeniami interfejsu, komunikatów i statusów oraz lokalnym formatowaniem dat i liczb,
- jasny i ciemny motyw oraz ekran ustawień z zapamiętywaniem preferencji w przeglądarce.

Etapy 7 i 8 pozostają poza zakresem.

## Zmiana założeń kont — 2026-10-27

- publiczny formularz `/register` z rejestracją przez Supabase Auth, logowaniem i obsługą potwierdzenia e-maila,
- usunięcie skryptu zakładającego właściciela i rezygnacja z modelu jednego konta,
- zachowanie izolacji kuponów użytkowników przez istniejące RLS,
- ujednolicenie importów do aliasów `@lib/…`, `@components/…` i `@app/…` oraz opis roli Dockera i konwencji Next.js.

Weryfikacja: lint, TypeScript, formatowanie i build. Sprawdzenie interfejsu wykonuje użytkownik.

## Układ meczów — 2026-10-27

- uproszczone etykiety i nagłówki; usunięte slogany oraz informacje o importach z interfejsu,
- grupowanie po lidze i sortowanie godziną wewnątrz grup,
- osobne kolumny drużyn, wynik pośrodku, pełna forma W/D/L z tooltipami i dane tabeli,
- podsumowanie H2H z rozwijaną historią, kursy na dole karty.

Kontrola: lint, TypeScript, formatowanie i build. Ręczne sprawdzenie UI wykonuje użytkownik.

## Filtrowanie kursów — 2026-10-27

- usunięty nagłówek i osobny formularz daty oraz filtry ligi, drużyny i statusu,
- wybór daty w pasku filtrów z natychmiastową nawigacją i ponownym odczytem danych,
- warunki dla dowolnego typu: zakres włącznie z granicami, `<`, `≤`, `>`, `≥`, `=`,
- wiele warunków łączonych jako wszystkie lub dowolny, obsługa liczb z przecinkiem i kropką, walidacja zakresu i brakujących kursów,
- filtrowanie kursów po stronie interfejsu bez kolejnych zapytań do bazy.

## Aktualizacja 2026-10-28 — metadane i kolejność rozgrywek

Status: ukończony. Migracja wdrożona lokalnie; usunięto i ponownie zaimportowano 163 wydarzenia na 2026-10-28. Żadne usuwane wydarzenie nie należało do kuponu. Odczyt bazy potwierdził 91 wydarzeń w preferowanych rozgrywkach i 72 pozostałe; wszystkie mają ID rozgrywek, a 5 spotkań towarzyskich nie ma kraju w API. Lint, TypeScript, formatowanie i build przechodzą.

- zapis kraju, ID/sluga rozgrywek, typu, poziomu i kolejności API w `events` oraz JSON,
- migracja `202610280003_competition_metadata.sql`,
- preferowane kraje: PL, Anglia, DE, FR, ES, PT, NL, BE, TR, IT, Szkocja, AT, CH; poziomy ligowe 1–2 i puchary,
- pozostałe rozgrywki poniżej, bez ukrywania i ograniczania importu,
- grupowanie po ID rozgrywek i kraj w nagłówku.

Etapy 7–8 pozostają poza zakresem.

## Aktualizacja 2026-10-28 — rozliczanie kuponów po imporcie wyników

Status: ukończony. Migracja wdrożona lokalnie. Uruchomienie `npm run results` sprawdziło 191 wydarzeń, zaktualizowało 53 i zapisało 29 wyników końcowych. Obecne 5 kuponów ma 10 oczekujących pozycji, więc pozostają aktywne. Lint, TypeScript, formatowanie i build przechodzą.

- `results` zapisuje wyniki wydarzeń i zawsze uruchamia `settle_coupons`, również dla wcześniej zapisanych wyników,
- niezależny wynik każdej pozycji: won/lost/void,
- pending ma pierwszeństwo w statusie kuponu; przegrana pojedynczego typu nie usuwa kuponu, który jeszcze czeka na inne wydarzenia,
- końcowy status i `settled_at` dopiero po rozliczeniu wszystkich pozycji,
- rozliczone kupony tylko w „Moich kuponach”, oznaczenia rozliczonych pozycji także w aktywnym boksie,
- potencjalna wygrana przy przegranej pozycji wynosi 0,
- migracja `202610280004_coupon_settlement.sql` naprawia również dotychczasowe częściowo rozliczone kupony.

## Aktualizacja 2026-10-29 — widok statystyk

Status: ukończony. Agregację odczytano na zapisanych kuponach; lint, TypeScript, formatowanie i build przechodzą. Ręczne sprawdzenie wyglądu pozostaje po stronie właściciela.

- chroniony widok `/statistics` i link w nawigacji,
- własne finanse: suma stawek, wygrane brutto, bilans rozliczonych kuponów, zwroty i oczekujące stawki,
- historia skumulowanego bilansu według dnia rozliczenia,
- wykres trafności według typu, przedziału utrwalonego kursu i rozgrywek, zawsze z liczbą prób,
- stronicowany, ograniczony do potrzebnych pól odczyt przez RLS, brak dodatkowych usług i zależności,
- obsługa pustych danych, PL/EN, jasnego i ciemnego motywu.

Etapy 7–8 pozostają poza zakresem.

## Aktualizacja 2026-10-31 — drużyny i herby

Status: ukończony. Migracja wdrożona lokalnie, wszystkie wcześniejsze wydarzenia mają powiązania drużyn. Uzupełniono 735 herbów (995 524 B, bez błędów). Import jednego rzeczywistego meczu na 2026-10-31 zakończył się poprawnie; ponowne uzupełnienie dwóch zapisanych herbów pobrało 0 B. Lint, TypeScript, formatowanie i build przechodzą.

- tabela teams ze stabilnym UUID i unikalnym ID dostawcy, RLS i zapisem wyłącznie przez importer,
- klucze obce home_team_id / away_team_id oraz uzupełnienie relacji istniejących wydarzeń po zapisanym participant_id,
- mały herb WebP 50 px zapisany raz na drużynę w lokalnej bazie, z limitem 64 KiB i hashem,
- wspólne opóźnienia/retry, cache braków HTTP 404, błędy herbów nie blokują importu meczów,
- automatyczne uzupełnianie podczas collect i osobne teams:sync dla dotychczasowych drużyn,
- lokalny endpoint obrazów i herby przy nazwach drużyn na kartach oraz kuponach, bez zależności od internetu przy odczycie.

Etapy 7–8 pozostają poza zakresem.

## Aktualizacja 2026-10-31 — ręcznie uruchamiana pętla wyników i widok live

Status: ukończony. Migracja wdrożona lokalnie, parser zweryfikowany odczytem rzeczywistego meczu live (wynik 2:2, minuta 69; wynik do końcowego rozliczenia pozostaje null). Lint, TypeScript, formatowanie i build przechodzą. Nie uruchomiono procesu results:watch ani cyklicznego harmonogramu.

- komenda results:watch z losową przerwą 5–10 minut po każdym przebiegu, wspólny przebieg z results, bez nakładania i autostartu,
- obsługa błędów, zmiany dnia oraz Ctrl+C/SIGTERM,
- osobne pola bieżących goli, minuty, fazy i godziny sprawdzenia,
- bezpieczny zapis wyniku końcowego i rozliczanie dopiero po zakończeniu,
- etykieta live i migawka wyniku na wydarzeniach oraz kuponach,
- mały odczyt wyników z lokalnej bazy co minutę, bez resetowania edycji i bez zapytań UI do Meczyków,
- automatyczne usunięcie rozliczonego boksu z widoku meczów.

Procesu cyklicznego agent nie uruchamia. Harmonogram systemowy, wdrożenie i pozostałe działania etapów 7–8 pozostają poza zakresem.

Aktualizacja: odstępy results:watch są losowane osobno po każdym zakończonym przebiegu (5–10 pełnych minut), a pozycje w widoku kuponów są sortowane rosnąco po terminie meczu. Pętli nie uruchamiano.

## Aktualizacja — układ kuponów i wydarzeń

Status: ukończony. Lint, TypeScript, formatowanie i build przechodzą. Ręczne sprawdzenie wyglądu pozostaje po stronie właściciela.

- ikony wyników pozycji i całych kuponów, w tym odrębne stany tymczasowe live bez zmiany rozliczania,
- wynik pomiędzy drużynami, termin w chipsie, potencjalna wygrana w podsumowaniu,
- usunięty tytuł kuponu, ikonowe akcje w nagłówku,
- usunięte „Sprawdzono”, minuta live zamiast godziny wydarzenia,
- wyrównane wiersze nazw/tabeli/formy; tabela tylko dla wydarzeń ligowych,
- obsługa PL/EN, obu motywów, małych ekranów i opisów dostępności ikon.
