# Trip Guide

A phone-friendly travel guide for **Billy and Isabel** — London (16–18 Sep 2026) plus Dublin notes.

Open the live site: [https://billyjameshowell.github.io/trip-guide/](https://billyjameshowell.github.io/trip-guide/)

This is a guide only. Do not book or pay from the site.

## What’s here

- Home page with trip overview and filters by **city** and **activity** (Bars, Food, Sights, Stay, Transport).
- Place cards with neighborhood, a short description, tags, official/booking links, and a status: **Confirmed**, **Suggested**, **Maybe**, **Need to book**, or **Requested**.
- All place content lives in one file: [`data/places.json`](data/places.json). The UI reads that file, so you can add cities and places without rewriting the page.

## Stack

Plain HTML, CSS, and a little JavaScript. No build step. GitHub Pages serves the files as-is from the repository root.

## Add a place

1. Open `data/places.json`.
2. Copy an existing object in the `places` array and edit it.

```json
{
  "id": "unique-kebab-id",
  "name": "Place name",
  "city": "Paris",
  "neighborhood": "Le Marais",
  "activity": "Food",
  "address": "Optional street address",
  "description": "One or two sentences.",
  "note": "Optional extra detail (booking caveats, room numbers, etc.)",
  "status": "suggested",
  "links": [
    { "label": "Official", "url": "https://example.com" }
  ]
}
```

3. If the city is new, add it to the top-level `cities` array (for example `"Paris"`). New activity types can go in `activities`.
4. Use one of these `status` values: `confirmed`, `suggested`, `maybe`, `need-to-book`, `requested`.
5. Commit and push to `main`. Pages will pick up the change.

Keep descriptions factual. Don’t invent prices or claim something is booked unless it is.

## Local preview

Because the page loads `data/places.json`, open it through a static server rather than a `file://` URL:

```bash
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).

## GitHub Pages

Pages is configured to publish the **root of `main`** (not `/docs`).

- Site URL: `https://billyjameshowell.github.io/trip-guide/`
- Source: branch `main`, folder `/` (root)
- [`.nojekyll`](.nojekyll) is included so GitHub does not run Jekyll on the static files.

If the live URL 404s, a repo admin needs one Settings click: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `/ (root)` → Save**.
