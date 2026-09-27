# Zapt Movers — site

Static site with one serverless function that forwards quote requests to SmartMoving.

```
index.html                      home page
blog/index.html                 blog listing
blog/california-to-texas/       article
blog/summer-move/               article
404.html                        not-found page
netlify/functions/lead.mjs      posts leads to SmartMoving, serves /api/lead
netlify.toml                    build + security headers
robots.txt, sitemap.xml         SEO
```

## Deploy

### Fastest test (no GitHub, ~2 minutes)

1. Go to https://app.netlify.com/drop
2. Drag this whole folder onto the page.
3. You get a live URL immediately.

Note: the quote form will fail on a drag-and-drop deploy until you add the
environment variable below. Everything else works.

### Real setup (GitHub + Netlify)

1. Create a repository at https://github.com/new — name it `zapt-movers-site`.
   **Make it private.** Public means anyone can read your config.

2. From inside this folder:

   ```bash
   git init
   git add .
   git commit -m "Zapt Movers site"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/zapt-movers-site.git
   git push -u origin main
   ```

3. In Netlify: **Add new site → Import an existing project → GitHub**, pick the repo.
   Leave the build command empty. Publish directory: `.`

4. **Required.** Site configuration → Environment variables → Add:

   ```
   Key:   SMARTMOVING_PROVIDER_KEY
   Value: 98f4b618-0190-4506-a109-aba7005c6e31
   ```

   Then trigger a redeploy. Functions only pick up new variables on a fresh build.

Every `git push` to `main` redeploys automatically. Pull requests get their own
preview URL, so you can review changes before they go live.

## Testing the form

Submit with a name like `TEST IGNORE` and your own phone number, then check
SmartMoving for the lead. Confirm origin, destination, move size and the notes
field all arrived.

If nothing shows up, open Netlify → Logs → Functions. The function logs both the
payload it sent and whatever SmartMoving replied.

Common results:

- `500 SMARTMOVING_PROVIDER_KEY is not set` — add the variable, then redeploy.
- `400 This lead has already been submitted` — expected. SmartMoving rejects
  duplicates. Change the phone number to test again.

## Before pointing the real domain at this

- Replace `(469) 868-8785` if that DFW number from Yelp is wrong.
- Set `CONFIG.email` in `index.html` to the address that should receive leads.
- Confirm `CONFIG.whatsapp` in `index.html` is a real WhatsApp number, or remove
  the WhatsApp button.
- Check the estimator price ranges in `CONFIG.base` match what your sales team quotes.
- Fill in `BRANCH_IDS` in `netlify/functions/lead.mjs` so leads route to the
  right market instead of all landing in the primary branch.
- Add an email copy of each submission inside the function. SmartMoving
  recommends this so an outage on their side never costs you a lead.
- Replace the three placeholder reviews with your real Google and Yelp text.
- Point `sitemap.xml` and `robots.txt` at the final domain.

## Troubleshooting the form

Check these two URLs in your browser, in this order.

1. `https://YOUR-SITE.netlify.app/.netlify/functions/lead`
   - `{"error":"Method not allowed"}` → the function deployed. Go to step 2.
   - Your 404 page → the function did not deploy. Confirm `netlify/functions/lead.mjs`
     is in the repo and `netlify.toml` has `functions = "netlify/functions"`.

2. `https://YOUR-SITE.netlify.app/api/lead`
   - `{"error":"Method not allowed"}` → routing is fine. The problem is the
     environment variable: add `SMARTMOVING_PROVIDER_KEY`, then **redeploy**.
   - Your 404 page → routing problem. The `_redirects` file and the `[[redirects]]`
     block in `netlify.toml` fix this. Redeploy after adding them.

The browser console on the quote page also prints the exact failure, prefixed
with `Zapt form:`.

## City pages

`movers/plano-tx/` is the template. Before duplicating it for another city,
replace the local content — not just the city name. Google treats near-identical
city pages as doorway pages and may rank none of them.

Each new city page needs its own version of:
- the four "what makes a move here different" cards (real local obstacles)
- the neighborhood list
- at least one review from a customer in that city
- title, meta description, canonical URL and the `areaServed` block in the schema

Suggested order: Frisco, Arlington, Fort Worth, Dallas, then San Francisco,
San Jose, Oakland, Los Angeles, Irvine. Stop at roughly ten.

## Regenerating city pages

City pages are generated, not hand-edited. Editing `movers/<slug>/index.html`
directly means your change is lost the next time anyone rebuilds.

```bash
python3 build/build.py
```

All local content lives in `build/cities.py`. To add a city, copy an existing
entry and replace **the local content**, not just the name:

- `cards` — four obstacles that are real in that city
- `hoods` — neighborhoods you actually work
- `faqs` — questions people there actually ask
- `title`, `meta`, `lede` — written for that city

If you cannot write four genuinely local obstacles, do not create the page.
Near-identical city pages are treated as doorway pages by Google and can hurt
the whole site rather than just failing to rank.

The build also rewrites `sitemap.xml`.

## Online booking

`/book/` is a five-step booking flow: date and addresses, access, inventory by
room, packing and materials, then a priced quote with two arrival windows.

Files:

```
book/index.html                 the flow
admin/pricing/                  settings editor (noindex)
assets/pricing.json             every number the calculator uses
assets/inventory.js             room-by-room catalog with cu ft and lbs
assets/booking-engine.js        pure calculation, no DOM
netlify/functions/booking.mjs   emails sales@ and creates a SmartMoving lead
```

### Required environment variables

```
RESEND_API_KEY         sign up at resend.com, verify zaptmovers.com as a sender
BOOKING_FROM_EMAIL     e.g. bookings@zaptmovers.com (must be on the verified domain)
SALES_EMAIL            defaults to sales@zaptmovers.com
```

`SMARTMOVING_PROVIDER_KEY` is already set and is reused, so every booking also
lands in the sales pipeline. Without `RESEND_API_KEY` the booking still reaches
SmartMoving and the full payload is written to the function log, but no email
is sent.

### Google Maps autocomplete

Set `googleMapsKey` in `assets/pricing.json` (or in the settings page). Enable
Places API and Distance Matrix API on the key. **Restrict the key by HTTP
referrer to your domain before going live** — an unrestricted key can be used
by anyone and billed to you. With no key, the address fields stay plain text
and drive time falls back to the configured minimum.

### Tuning the price

`cuftPerMoverPerHour` is the number that moves everything. Start at 55, then
compare a few real completed jobs against what the calculator would have
quoted and adjust. The settings page recalculates a sample 2-bedroom move as
you type so you can see the effect immediately.

Saving in the settings page writes to **your browser only**, for testing.
To make changes live, download `pricing.json` and replace the file in the repo.

### If address autocomplete does not work

The booking page now says so on screen instead of failing silently, and the
browser console prints the specific cause. The usual one:

**The key is set in the settings page but not live.** "Save to this browser"
does exactly that — it saves to your browser. Open `/assets/pricing.json` on the
deployed site and look at `googleMapsKey`. If it is `""`, download the file from
the settings page, replace it in the repo and deploy.

The address module (`assets/places.js`) tries `PlaceAutocompleteElement` and the
Routes API first, then falls back to the legacy `Autocomplete` widget and
Distance Matrix, so it works on Google Cloud projects created before and after
the March 2025 changes. With no key, the fields stay plain text and the customer
is told to type the full address.
