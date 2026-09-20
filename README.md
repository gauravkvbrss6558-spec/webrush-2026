# Your Life, In Receipts

Built for **WebRush — 6-Hour Frontend Hackathon**, track *"Your Life, In Receipts"*.

**[Live demo →](#)** _https://webrush-2026.vercel.app/_

## The idea

Nobody's digital life arrives as one file — it arrives in exports: a streaming
history, a bank statement, a spending log kept out of habit. Each one is
honest but partial.

This project takes **three real, independently-collected datasets** and
treats them as if they belonged to one person, laid chapter by chapter into
a single reconstructed decade:

| Chapter | Source | Span | Records |
|---|---|---|---|
| **Ch.01 — The Playlist Years** | Spotify listening history | Jul 2013 – Dec 2024 | 149,860 plays |
| **Ch.02 — The Ledger** | Daily household transactions | Jan 2015 – Sep 2018 | 2,461 entries |
| **Ch.03 — The Wanderer** | Augmented India transactions | Apr 2022 – Apr 2024 | 1,500 unique charges (deduped from 10,267 raw rows) |

The three datasets don't know each other exist — the seams are left visible
on purpose. That honesty *is* the story: our digital exhaust is fragmented
across platforms and eras, and only looks like "a life" once someone
bothers to lay the pieces side by side.

## What it does

- **Three chapters**, each styled as a different "carbon-copy" ink colour,
  with its own stats, chart, and interaction:
  - *Playlist Years* — a month-scrubber over 118 months of late-night
    listening % vs. skip rate, with a receipt-style read-out per month.
  - *The Ledger* — an income/expense bar chart filterable by spending
    category, plus real anonymised notes pulled from the log.
  - *The Wanderer* — monthly spend across 300+ cities, a top-cities grid,
    and a "stamped unusual" list of the largest flagged charges.
- **Life Arc** — all three chapters normalised onto one shared 2013–2024
  timeline, togglable by layer, with a genuinely computed insight: in the
  39 months where the Playlist Years and Ledger data overlap, Spotify
  skip-rate and monthly expense move together with a Pearson correlation
  of **-0.308**.
- **Receipts Explorer** — a single search box that filters across all
  5,294 combined receipts (song-of-the-day samples, every ledger entry,
  every deduped card charge) by keyword, city, artist, category, or year.
  Try searching a city name to see it show up in two unrelated sources at once.

## Tech

Plain HTML/CSS/JS. No build step, no framework, no backend.

- `index.html` — structure + the pre-aggregated dataset embedded inline as
  JSON (so the whole thing is a single deployable static bundle)
- `style.css` — the design system (receipt-paper palette, one ink colour
  per chapter, Space Mono + Fraunces)
- `app.js` — all interactivity: charts (Chart.js via CDN), the month
  scrubber, category filters, and the receipts search
- Charting: [Chart.js](https://www.chartjs.org/) loaded from cdnjs — the
  only external dependency besides Google Fonts

## Data processing

The raw CSVs (149K Spotify rows, 2.4K household rows, 10K+ India-transact
rows with heavy duplication) were pre-aggregated with a Python/pandas
script into compact monthly summaries and a combined ~5,300-row receipts
table, then embedded directly into `index.html` — no server, no database,
nothing leaves the browser.

## Running locally

It's a static site — just open `index.html` in a browser, or serve the
folder:

```bash
python3 -m http.server 8080
# visit http://localhost:8080
```

## Deploying

Drag the folder into [Netlify Drop](https://app.netlify.com/drop), or push
to a repo and enable GitHub Pages on the root — no build command needed.

## Data sources

- Spotify extended streaming history (personal export)
- "Daily Household Transactions" (public Kaggle dataset)
- "Augmented India Transact MultiFacet 2024" (public Kaggle dataset)

Reassembled here into one fictional composite life for storytelling
purposes — the people behind the three real datasets never met.
