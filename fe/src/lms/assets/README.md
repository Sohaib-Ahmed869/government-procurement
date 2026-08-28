# Auth panel animation

`auth-online-course.json` is the Lottie shown beside the sign-in and sign-up
forms.

## Where it came from

Downloaded from LottieFiles as **"OnlineCourse Bake"**:

    https://assets1.lottiefiles.com/packages/lf20_phjobus6.json

## What was changed

Nothing by hand. It was run through `scripts/recolour-lottie.mjs`, which walks
the document and remaps solid fills onto the brand palette:

    node scripts/recolour-lottie.mjs <original.json> src/lms/assets/auth-online-course.json

That pass recoloured 132 fills and deliberately left 205 alone — near-neutrals,
which carry the line work, and warm mid-tones, which are skin and hair. Turning
a person's face green is the failure mode of every automated palette swap.

To swap in a different animation: download its JSON, run the same command, and
the panel picks it up. `AuthLottie` falls back to the static motif if the file
or the player fails to load, so a bad swap degrades rather than breaking the
sign-in page.

## Licence — CONFIRM BEFORE GO-LIVE

LottieFiles free animations are published under the Lottie Simple License,
which broadly permits commercial use, but the terms are per-animation and their
site could not be read programmatically to check this one. Open the animation's
page on lottiefiles.com, confirm its licence and whether attribution is
required, and record the answer here before this ships to a client.
