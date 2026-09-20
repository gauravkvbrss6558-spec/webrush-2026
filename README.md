# Your Life, In Receipts

> Three unrelated data exports reassembled into one reconstructed decade.
> Built for **WebRush — 6-Hour Frontend Hackathon 2026**, track *"Your Life, In Receipts"*.

**Live demo:** https://webrush-2026.vercel.app
**Repository:** https://github.com/gauravkvbrss6558-spec/webrush-2026

## Table of contents
1. [The idea](#the-idea)
2. [Features](#features)
3. [Tech stack](#tech-stack)
4. [Project structure](#project-structure)
5. [Getting started](#getting-started)
6. [Data processing](#data-processing)
7. [Accessibility and performance](#accessibility-and-performance)
8. [Deployment](#deployment)
9. [Data sources](#data-sources)
10. [License](#license)

## The idea
Nobody's digital life arrives as one file. It arrives in exports: a streaming history,
a bank statement, a spending log kept out of habit. This project treats three real,
independently collected datasets as one person's paper trail and leaves the seams visible.

| Chapter | Source | Span | Records |
| --- | --- | --- | --- |
| Ch.01 The Playlist Years | Spotify listening history | Jul 2013 – Dec 2024 | 149,860 plays |
| Ch.02 The Ledger | Daily household transactions | Jan 2015 – Sep 2018 | 2,461 entries |
| Ch.03 The Wanderer | Augmented India transactions | Apr 2022 – Apr 2024 | 1,500 unique charges (from 10,267 raw rows) |

## Features
- **Playlist Years:** month scrubber over 118 months comparing late-night listening with skip rate.
- **The Ledger:** income vs. expense chart, filterable by category, with real notes from the log.
- **The Wanderer:** monthly spend across 300+ cities, top-cities grid, largest flagged charges.
- **Life Arc:** all three datasets on one 2013–2024 timeline with layer toggles and a computed
  Pearson correlation (-0.308) between skip rate and monthly expense over 39 overlapping months.
- **Receipts Explorer:** one search across 5,294 records by keyword, city, artist, category or year.
- **Privacy:** frontend only, no backend, no tracking. Nothing leaves the browser.

## Tech stack
- HTML5, CSS3, vanilla JavaScript (no framework, no build step)
- [Chart.js](https://www.chartjs.org/) via cdnjs
- Google Fonts: Space Mono and Fraunces
- Hosting: Vercel

## Project structure
```
webrush-2026/
├── index.html          # page structure and embedded pre-aggregated JSON data
├── style.css           # design system (receipt-paper palette, one ink colour per chapter)
├── app.js              # charts, month scrubber, category filters, receipts search
├── package.json        # project metadata and helper scripts
├── vercel.json         # static hosting config and security headers
├── .github/workflows/  # CI checks
├── LICENSE
└── README.md
```

## Getting started
```bash
git clone https://github.com/gauravkvbrss6558-spec/webrush-2026.git
cd webrush-2026
npm start        # serves the site at http://localhost:3000
```
Or open `index.html` directly, or run `python3 -m http.server 8080`.

## Data processing
The raw CSVs (149K Spotify rows, 2.4K household rows, 10K+ India-transaction rows with heavy
duplication) were pre-aggregated with Python/pandas into compact monthly summaries and a
combined ~5,300-row receipts table, then embedded into `index.html` as JSON.

## Accessibility and performance
- Semantic landmarks and headings, responsive layout
- No build step and a single deployable static bundle
- Only external dependencies: Chart.js (cdnjs) and Google Fonts

## Deployment
Deployed on Vercel from the `main` branch. No build command is needed; the output directory
is the repository root. Every push to `main` redeploys automatically.

## Data sources
- Spotify extended streaming history (personal export)
- "Daily Household Transactions" (public Kaggle dataset)
- "Augmented India Transact MultiFacet 2024" (public Kaggle dataset)

The three datasets are reassembled into one fictional composite life for storytelling.

## License
MIT. See [LICENSE](LICENSE).
