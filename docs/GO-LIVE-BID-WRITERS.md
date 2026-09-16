# Go-live: Find a Bid Writer (B7)

The directory is built and tested. Whether it's advertised is a single switch
in the CMS — no environment variable, no deploy, no code change.

## Where it stands today

The page and its API are always live: `/find-a-bid-writer` always routes, and
the public directory endpoint always serves whatever listings are marked
"Placement is paid and live". What changes with the switch is only whether the
page is *advertised*:

| Switch | The page | The nav | The API | Search engines |
|---|---|---|---|---|
| Off | works, reachable at the direct URL | absent from the top ribbon and footer | serves the public | `noindex, nofollow` |
| On | works | on the top ribbon and in the footer | serves the public | indexable |

This is the same switch every other top-level page on the site has — hiding a
page here never takes the page itself down, only the link to it.

## Where to flip it

**Admin → Site → Site Navigation.** Find "Find a Bid Writer" in the list and
turn it on. Takes effect immediately, on the next page load — nothing to
rebuild or redeploy.

## Before you flip it

1. **Placements are paid for.** A listing only shows when *"Placement is paid
   and live"* is ticked on it in the CMS, and that is off by default. Check
   **Content → Find a Bid Writer** and confirm every ticked listing has
   actually been invoiced. Turning the page on in Site Navigation makes the
   directory visible; this tick makes a company visible within it.
2. **At least one listing is live.** Switching the page on with an empty
   directory advertises that nobody signed up.
3. **Each listing has been read.** The blurb is the advertiser's own words and
   goes out under our banner.

## Checking it worked

- "Find a Bid Writer" is on the top ribbon and in the footer.
- View source: there is **no** `<meta name="robots" content="noindex, nofollow">`.
- The listings you expect are there, and no listing you have not been paid for.

## Turning it back off

Switch it off in Site Navigation. The nav entries disappear and the page goes
back to noindex — but it stays reachable at its direct URL, and the listings
are untouched, so nothing has to be redone to switch it back on.
