# Arad Portfolio Tracker

My personal portfolio tracker. It was originally built on Base44 and now runs entirely on Netlify.

## How it works

| Piece | Where |
|---|---|
| UI (React + Vite + Tailwind + shadcn/ui) | `src/` (pages and components are the same as the Base44 version) |
| Backend API (login, data, market data, import/export) | `netlify/functions/api.mjs`, served at `/api/*` |
| Daily closing-price snapshot | `netlify/functions/daily-snapshot.mjs` runs Mon–Fri at 21:15 UTC (after the close) |
| Database | Netlify Blobs (store `portfolio-data`), one JSON document per table |
| Market data | Yahoo Finance; Finnhub is an optional fallback if `FINNHUB_API_KEY` is set |

`src/api/base44Client.js` is a drop-in replacement for the old Base44 SDK, so the
pages still call `base44.entities.X.list()` and `base44.functions.invoke()`
as before. The calls now go to `/api/*`.

## Environment variables (Netlify → Project configuration → Environment variables)

| Name | Purpose |
|---|---|
| `APP_PASSWORD` | Login password. Changing it logs out every device. |
| `SESSION_SECRET` | Signs the login cookie. |
| `OWNER_EMAIL` | Shown as the account email. |
| `FINNHUB_API_KEY` | Optional backup price source. |

After changing a variable, redeploy so the new value takes effect.

## Data

The **DATA** page has:

- **Download backup**: one JSON file with every table plus notes.
- **Import**: a backup file, or a CSV/JSON export of a single table (for example from Base44).
- A row count for each table.

## Changes from the Base44 version

- The news page shows real Yahoo Finance headlines and links. The old version had an AI write "realistic" URLs, so its links could be invented.
- The earnings calendar works again (Yahoo). It used to return an empty list.
- Option prices now use Yahoo's cookie/crumb handshake. Yahoo's v7 endpoints started requiring it; the old code noted 401 "Invalid Crumb" errors on those endpoints.
- Chart data comes from Yahoo instead of the dead Tradier key.
- The news page loads on first visit. Before, it stayed empty until you pressed REFRESH.
- Login is a single password. Removed Base44-only pieces: the visual editor, the OAuth consent page, analytics.

## Local development

```bash
npm install
npx netlify dev   # runs the UI and functions together
```
