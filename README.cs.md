English: [README.md](README.md) · Průvodní text: [PRUVODNI_TEXT.md](PRUVODNI_TEXT.md)

# Formulář přihlášení k odběru novinek (praktický úkol FE, POLO3)

Stránka nenačítá žádnou knihovnu; npm balíčky jsou jen vývojové nástroje (Sass, linty, testy).

Jedna statická stránka (`index.html`) s přístupným formulářem pro odběr novinek: klientská validace, odeslání přes
dodanou funkci `submitMock`, stavy úspěchu a chyby serveru, světlý a tmavý režim (podle `prefers-color-scheme`, navíc
přepínač, který si volbu pamatuje). Čisté HTML, SCSS přeložené do CSS a JavaScript bez knihoven v IIFE.

Každý skriptový soubor začíná na 1. řádku `'use strict';`, za ním následuje IIFE (bod E2 kontrolního seznamu; eslint
`strict`, režim global; soubory jsou klasické skripty, proto `eslint.config.js` nastavuje `sourceType: 'script'`).

## Spuštění

Otevřete `index.html` v prohlížeči. Server ani build nejsou potřeba: zkompilované `css/main.css` je v repozitáři
a skripty jsou klasické `<script>` soubory, takže stránka funguje i z `file://`.

Stav chyby serveru vyvoláte e-mailem `x@error.test`.

Volba z přepínače režimu se uloží v prohlížeči a má přednost před `prefers-color-scheme`. Dalším přepnutím režim
změníte zpět; po smazání dat webu se stránka znovu řídí nastavením systému.

## Překlad SCSS

```bash
npm ci               # jednou
npm run build:css    # scss/main.scss -> css/main.css, pak stylelint --fix sjednotí formátování
npm run watch:css    # překlad při každé změně
```

Bez npm skriptů: `npx sass --no-source-map scss/main.scss css/main.css`.

## Kontroly

```bash
npx playwright install chromium   # jednou
npm run check                     # build CSS, stylelint, eslint, Nu validátor, jscpd, kontrola zakázaných výrazů, testy Playwright
npm run screenshots               # screenshots/{360,768,1280}-{light,dark}.png
```

`npm run check` spustí 110 testů Playwright (každý scénář ve světlém i tmavém projektu), s axe-core ve výchozím
stavu, s chybami, s chybou serveru a po úspěchu, s průchodem jen klávesnicí a kontrolou šířek 320/360/768/1280 px.
Testy i screenshoty si spouštějí vlastní lokální server na `localhost`, port 4317 (jiný port nastavíte proměnnou
prostředí `PORT`); mimo CI testy použijí server, který na tomto portu už běží.

Požadavky: Node.js 20.19 nebo novější. `lint:html` spouští W3C Nu validátor z balíčku `vnu-jar` a potřebuje Javu;
bez Javy ověřte `index.html` a `podminky.html` online validátorem na https://validator.w3.org/nu/.

## Struktura souborů

```
index.html, podminky.html   stránka a ukázková stránka podmínek
js/newsletter-form.js       logika formuláře: TEXTS, validace, submitMock, stavy
js/theme.js                 přepínač režimu; blokující skript v <head>, uložený režim platí před prvním vykreslením
scss/                       vrstvy ITCSS: settings (tokeny), tools, generic, elements, components, utilities
css/main.css                zkompilované CSS (v repozitáři, stránka nepotřebuje build)
tests/                      end-to-end testy Playwright + axe-core
scripts/                    lokální server, kontrola zakázaných výrazů, screenshoty
screenshots/                360, 768 a 1280 px, světlý a tmavý režim
```
