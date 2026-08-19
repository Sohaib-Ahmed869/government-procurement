# Go-live: Find a Bid Writer (B7)

The directory is built, tested and deliberately held off the live site. Nothing
about switching it on requires a code change — it is two environment variables
and a deploy.

## Where it stands today

| Setting | The page | The nav | The API | Search engines |
|---|---|---|---|---|
| `off` *(default)* | not routed; `/find-a-bid-writer` 404s | absent | 404 for the public | nothing to index |
| `preview` | works, with a "Preview only" banner | absent | serves the public | `noindex, nofollow` |
| `live` | works | **on the top ribbon and in the footer** | serves the public | indexable |

`off` is the default for anything unrecognised, including the variable being
absent. A production environment that has never heard of these variables gets
the safe answer.

## Before you flip it

1. **Placements are paid for.** A listing only shows when *"Placement is paid and
   live"* is ticked on it in the CMS, and that is off by default. Check
   **Content → Find a Bid Writer** and confirm every ticked listing has actually
   been invoiced. The flag makes the page visible; this tick makes a company
   visible.
2. **At least one listing is live.** Switching the page on with an empty
   directory advertises that nobody signed up.
3. **Each listing has been read.** The blurb is the advertiser's own words and
   goes out under our banner.

## The switch

Two variables, because the nav and the route are decided when the frontend is
built and the API gate is decided at runtime. Both have to move.

**Backend** (`be/.env`, or the host's environment):

```
FEATURE_BID_WRITERS=live
```

**Frontend** (`fe/.env`, or the host's build environment):

```
VITE_FEATURE_BID_WRITERS=live
```

Then redeploy both. The frontend one matters most: it is read at build time, so
changing it without rebuilding does nothing.

## Checking it worked

- `/find-a-bid-writer` loads.
- "Find a Bid Writer" is on the top ribbon and in the footer.
- View source: there is **no** `<meta name="robots" content="noindex, nofollow">`.
- The listings you expect are there, and no listing you have not been paid for.

## Turning it back off

Set both variables to `off` and redeploy. The page stops being routed, the API
returns to 404, and the nav entries disappear. Listings are untouched, so
nothing has to be rebuilt to switch it on again.
