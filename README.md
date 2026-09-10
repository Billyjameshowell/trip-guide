# Trip Guide

A phone-friendly travel guide for **Billy and Isabel** — London (16–18 Sep 2026), then the Cotswolds, Dublin, and Lisbon.

Open the live site: [https://trip-guide-a1c.pages.dev](https://trip-guide-a1c.pages.dev)

This is a guide only. Do not book or pay from the site.

## What’s here

- Home page with trip overview and filters by **city** and **activity** (Bars, Food, Sights, Stay, Transport).
- [Itinerary](itinerary.html) with the day-by-day plan (15–27 Sep 2026). Open flights and uncertain bits are marked **Need to book**, **TBD**, or **Assumed**. Days live in [`data/itinerary.json`](data/itinerary.json).
- Place cards with neighborhood, a short description, tags, official/booking links, and a status: **Confirmed**, **Suggested**, **Maybe**, **Need to book**, **Requested**, or **Hidden**.
- Hotel suggestions under **Stay** include dated price snapshots and booking links. Nothing is booked unless a card says so.
- Status chips are editable on the page. Picks are stored in `localStorage` on that phone only and are not written back to `data/places.json`. Hidden places drop out of the default list; use **Show hidden** to bring them back.
- All shared place content lives in one file: [`data/places.json`](data/places.json). The UI reads that file, so you can add cities and places without rewriting the page.

## Stack

Plain HTML, CSS, and a little JavaScript. No build step. Cloudflare Pages (`trip-guide`) auto-deploys from `main`. GitHub Pages can also serve the repository root.

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
  "note": "Optional extra detail (booking caveats, room numbers, dated price snapshots, etc.)",
  "status": "suggested",
  "links": [
    { "label": "Official", "url": "https://example.com" }
  ]
}
```

3. If the city is new, add it to the top-level `cities` array (for example `"Paris"`). New activity types can go in `activities`.
4. Use one of these `status` values: `confirmed`, `suggested`, `maybe`, `need-to-book`, `requested`, `hidden`.
5. Commit and push to `main`. Pages will pick up the change.

Keep descriptions factual. Don’t invent prices or claim something is booked unless it is. Hotel prices in this guide are dated snapshots only.

## Edit the itinerary

1. Open `data/itinerary.json`.
2. Change a day in the `days` array, or an item in `openTasks`.
3. Use these day/item `status` values: `confirmed`, `need-to-book`, `tbd`, `assumed`.
4. To point at a place on the guide, set `"placeId": "blind-spot"` (uses the place `id` in `places.json`). You can also set `"href": "index.html?activity=Stay"`.
5. Commit and push to `main`.

Weekdays follow the 2026 calendar (16 Sep is a Wednesday). Do not invent hotel bookings or flight numbers.

## Statuses on a phone

Tap a place’s status chip to pick another status. **Hidden** removes that card from the default list on that device. Overrides stay in the browser (`trip-guide-status-overrides`) so two phones can each keep their own picks without a backend.

## Local preview

Because the page loads `data/places.json`, open it through a static server rather than a `file://` URL:

```bash
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).

## Hosting

- **Cloudflare Pages:** project `trip-guide`, production URL [https://trip-guide-a1c.pages.dev](https://trip-guide-a1c.pages.dev), deploys from `main`.
- **GitHub Pages:** [https://billyjameshowell.github.io/trip-guide/](https://billyjameshowell.github.io/trip-guide/) publishes the **root of `main`** (not `/docs`). [`.nojekyll`](.nojekyll) is included so GitHub does not run Jekyll on the static files.
