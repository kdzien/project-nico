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
