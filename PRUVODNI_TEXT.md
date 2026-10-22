# Praktický úkol FE — přihlášení k odběru novinek

Stránka nenačítá žádnou knihovnu; npm balíčky jsou jen vývojové nástroje (Sass, linty, testy). Spuštění a překlad SCSS: [README.cs.md](README.cs.md) (česky), [README.md](README.md) (anglicky).

## Co je hotové
- F1: `aria-invalid` a hláška s `role="alert"` navázaná přes `aria-describedby`; fokus na první chybu.
- F2: jen nativní prvky, vše jde ovládat jen klávesnicí; `:focus-visible` ověřuje test po stisku Tabu.
- F3: na 360 px jeden sloupec; formulář max. 640 px (40rem) uprostřed; 6 screenshotů.
- F4: hodnoty jen v `_tokens.scss`, z nich proměnné na `:root`; tmavý režim podle systému.
- F5: kontrast viz níže; chybu nese text s ikonou „!“, ne jen barva.
- F6: texty z JS v objektu `TEXTS`, statické v HTML; `<form>`, `<fieldset>`/`<legend>`, `<label>`.
- F7: `'use strict';` na 1. řádku (E2), pak IIFE; bez globálních proměnných a frameworku.
- F8: `submitMock` beze změny v IIFE; při chybě hláška `role="alert"`, hodnoty zůstanou.
- Kontroly: `npm run check` (stylelint, eslint, Nu validátor, jscpd, zakázané výrazy, testy).
- Lighthouse (Chrome DevTools): 100 / 100 / 100 / 100 ve světlém i tmavém režimu.

## Navíc (a proč)
- Konvence ze seznamu: ITCSS, `theme-color()`/`space()`/`size()`, mixin `media()`, třídy `js-*`/`is-*`; od 768 px je formulář na kartě, zájmy jsou dlaždice klikatelné celou plochou.
- Přepínač režimu (bez uložené volby platí nastavení systému, `js/theme.js` v `<head>` brání probliknutí); 110 testů Playwright (55 scénářů v obou režimech) s axe-core.

## Rozhodnutí, která stojí za zmínku
- `poloNewsletterForm(id)` není globální (E4 má přednost před E6). „Přihlásit další e-mail“ je `<button>` (akce, ne navigace).
- Zkompilované CSS je v repozitáři, protože ho zadání vyžaduje (oproti I4). `poloWindowError` tu neexistuje, chybu serveru hlásí vlastní hláška s `role="alert"` (E5).
- Kontrast podle WCAG na ploše formuláře, světlý / tmavý: text 17,40 / 14,63; tlumený text 6,83 / 8,68; text tlačítka 6,39 / 8,24; chyba 6,54 / 6,92.

## Vynecháno a netýká se
- Fungování bez JavaScriptu: odeslání simuluje `submitMock`, bez JS není kam formulář odeslat. Automatické testy běží jen v Chromiu.
- Netýká se (v úkolu nejsou): A1 obrázky, A2 ikonová tlačítka, A5 Esc a šipky (menu, dialogy), A8 kroky, E3 Razor, F a G backend, J1 ověření na vývojovém prostředí, J4 factory.
