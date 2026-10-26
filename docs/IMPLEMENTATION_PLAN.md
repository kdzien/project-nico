# Plan implementacji

Każdy etap kończy się działającym, możliwym do zweryfikowania fragmentem. Nie rozpoczynamy kolejnego etapu, dopóki lint, TypeScript i testy bieżącego etapu nie przechodzą.

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

- klient Supabase dla serwera i przeglądarki,
- logowanie e-mail/hasło,
- wylogowanie i odświeżanie sesji,
- ochrona tras aplikacji,
- brak publicznej rejestracji w produkcji,
- testy polityk RLS.

Kryterium ukończenia: właściciel loguje się lokalnie i widzi chroniony ekran; inny użytkownik nie odczytuje jego danych.

## Etap 3 — zapis importu do bazy

- `SupabaseRepository` zgodne z `CollectionRepository`,
- upsert wydarzeń po `(provider, external_id)`,
- wybór pierwszego kompletnego zestawu kursów bez zapisywania bukmachera,
- import dla bieżącego dnia w `Europe/Warsaw`,
- wpisy w `import_runs`,
- pozostawienie JSON-a jako opcjonalnego outputu,
- test mapowania odpowiedzi API na rekord bazy.

Kryterium ukończenia: ponowienie tego samego importu nie tworzy duplikatów, a błąd jest widoczny w `import_runs`.

## Etap 4 — lista wydarzeń

- ekran dzisiejszych wydarzeń,
- sortowanie według godziny,
- filtry ligi, drużyny i statusu,
- kursy `1`, `X`, `2`, `1X`, `2X`,
- rozwijane tabele, forma i H2H,
- czytelne stany braku danych i nieudanego importu.

Kryterium ukończenia: użytkownik może sprawnie przejrzeć wszystkie mecze dnia na komputerze i telefonie.

## Etap 5 — budowanie kuponu

- podręczny kupon na ekranie wydarzeń,
- jeden wybór na wydarzenie,
- automatyczny kurs łączny,
- zapis wersji roboczej,
- lista, edycja i usuwanie własnych kuponów,
- zapis `odds_at_add` dla każdej pozycji.

Kryterium ukończenia: zapisany kupon zachowuje swoje kursy nawet po zmianie kursów wydarzenia.

## Etap 6 — wyniki i rozliczanie

- ponowne pobieranie niezakończonych wydarzeń,
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
