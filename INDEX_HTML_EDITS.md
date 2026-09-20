# index.html — 3 small edits (do NOT replace the whole file; it holds your data blob)

Easiest way: open the repo on GitHub and press the **`.`** key (opens github.dev, a
browser VS Code). Open `index.html`, use **Ctrl+H** (find & replace) or edit by hand.

---

## EDIT 1 — replace the whole `<head>` contents

Delete everything between `<head>` and `</head>` and paste this:

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Your Life, In Receipts — a reconstructed digital life</title>
<meta name="description" content="Three real anonymised data trails — a decade of Spotify plays, a household expense diary, and a trail of card transactions — stitched into one interactive life story.">
<meta name="theme-color" content="#131210">
<meta property="og:type" content="website">
<meta property="og:title" content="Your Life, In Receipts">
<meta property="og:description" content="Three unrelated data exports reassembled into one interactive life story.">
<meta property="og:url" content="https://webrush-2026.vercel.app/">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%A7%BE%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
<link rel="stylesheet" href="style.css">
<!-- Google Fonts load without blocking first paint (display=swap + fallbacks in CSS) -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Fraunces:wght@400;600&display=swap" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Fraunces:wght@400;600&display=swap"></noscript>
```

## EDIT 2 — add a `<main>` landmark + skip link (fixes the "no main landmark" audit)

a) Right after the opening `<body>` tag, add:
```html
<a class="skip-link" href="#main">Skip to content</a>
```

b) Find this line:
```html
<div class="tear" aria-hidden="true"></div>
```
and put `<main id="main">` on the line **above** it:
```html
<main id="main">
<div class="tear" aria-hidden="true"></div>
```

c) Find `<footer>` and put `</main>` on the line **above** it:
```html
</main>

<footer>
```

## EDIT 3 — defer the two scripts (removes render-blocking JS)

Find these two lines at the bottom of the file:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js"></script>
...
<script src="app.js"></script>
```
and add `defer` to both:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js" defer></script>
...
<script src="app.js" defer></script>
```
(Leave the big `<script id="lifeData" type="application/json">…</script>` between them untouched.)

---

## Then upload `app.js` and `style.css`
Replace the two files in the repo with the ones from this folder. Suggested commits:
- `perf: defer scripts, non-blocking fonts, idle chart rendering`
- `a11y: add main landmark, skip link, AA contrast, aria-pressed states`
