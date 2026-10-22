Česky: [README.cs.md](README.cs.md) · Cover text (Czech): [PRUVODNI_TEXT.md](PRUVODNI_TEXT.md)

# Newsletter signup form (POLO3 FE assignment)

The page loads no library; the npm packages are development tools only (Sass, linters, tests).

One static page (`index.html`) with an accessible newsletter signup form: client-side validation, submission through
the provided `submitMock`, success and server-error states, light and dark mode (follows `prefers-color-scheme`, plus a
toggle that remembers the choice). Plain HTML, SCSS compiled to CSS, and vanilla JavaScript in an IIFE.

Each script file starts with `'use strict';` on line 1, followed by an IIFE (checklist item E2; eslint `strict`, global
mode; the files are classic scripts, so `eslint.config.js` sets `sourceType: 'script'`).

## Running

Open `index.html` in a browser. No server and no build are needed: the compiled `css/main.css` is committed, and the
scripts are classic `<script>` files, so the page works from `file://`.

Try `x@error.test` as the e-mail to see the server-error state.

A choice made with the theme toggle is stored in the browser and overrides `prefers-color-scheme`. Toggling again
switches back; after the site data is cleared, the page follows the system setting again.

## Compiling SCSS

```bash
npm ci               # once
npm run build:css    # scss/main.scss -> css/main.css, then stylelint --fix normalises the formatting
npm run watch:css    # rebuild on every change
```

Without the npm scripts: `npx sass --no-source-map scss/main.scss css/main.css`.

## Checks

```bash
npx playwright install chromium   # once
npm run check                     # build CSS, stylelint, eslint, Nu validator, jscpd, forbidden-string scan, Playwright tests
npm run screenshots               # screenshots/{360,768,1280}-{light,dark}.png
```

`npm run check` runs 110 Playwright tests (each scenario in a light and a dark project), with axe-core on the
default, error, server-error and success states, a keyboard-only run, and width checks at 320/360/768/1280 px.
The tests and screenshots start their own local server on `localhost`, port 4317 (set the `PORT` environment variable
to use another one); outside CI, the tests reuse a server that is already running on that port.

Requirements: Node.js 20.19 or newer. `lint:html` runs the W3C Nu validator from the `vnu-jar` package and needs Java;
without Java, check `index.html` and `podminky.html` with the online validator at https://validator.w3.org/nu/.

## File layout

```
index.html, podminky.html   the page and a sample terms page
js/newsletter-form.js       form logic: TEXTS, validation, submitMock, states
js/theme.js                 theme toggle; loaded blocking in <head> so a stored theme applies before first paint
scss/                       ITCSS layers: settings (tokens), tools, generic, elements, components, utilities
css/main.css                compiled CSS (committed, the page needs no build)
tests/                      Playwright + axe-core end-to-end tests
scripts/                    local server, forbidden-string scan, screenshots
screenshots/                360, 768 and 1280 px, light and dark
```
