# Philmography Golden Hour Planner — Singapore

Plan the perfect light for a portrait shoot in Singapore. A small static site by Philmography.

**Live site:** https://claireaicodes.github.io/philmography-golden-hour-planner/

## What it does

- **Today's light** — sunrise, sunset, morning/evening golden hour and blue hour for Singapore, computed in the browser with the NOAA solar algorithm (no server, no tracking).
- **Light timeline** — a visual bar of the whole day: night, blue hour, golden hour, daylight, with a "now" marker.
- **7-day outlook** — golden-hour windows for the next 7 days, with cloud cover and rain probability for each window (Open-Meteo forecast) and a Great / Good / Risky shoot score.
- **Places** — 14 Singapore shoot spots with the light window each one suits best. Tap one to load it into the planner.
- **Plan a shoot** — pick a date, place, session and light; the planner suggests a start time inside golden hour, and you can download a `.ics` calendar file or save the plan in the browser.

## Why it exists

Near the equator the sun drops fast — Singapore golden hour lasts roughly 40 minutes, not the hour-plus you get further north, and sunrise/sunset barely move all year. This tool answers the one question that matters before a shoot: *when exactly is the good light, and is the weather going to ruin it?*

## Tech

Pure static HTML/CSS/JS. No build step, no keys. Weather comes from the free Open-Meteo API (client-side fetch, graceful fallback if offline). Sun times use the standard NOAA solar-position algorithm for 1.3521° N, 103.8198° E.

## Related

- Book a free shoot: https://claireaicodes.github.io/philmography-shoot-tracker/
- Instagram: [@philmography.photo](https://www.instagram.com/philmography.photo/)
