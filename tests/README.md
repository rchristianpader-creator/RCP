# Liquid feedback QA — 2026-09-08

Base: production commit 05d8e3502a07bf8ffe4a4eecd5667b2273121a37 (v204).
Candidate: v205. Status: **not cleared for production; device verification pending**.

Run `npm test` (Node built-in test runner, no package installation required).

## Results

Before fixes: 13 of 16 liquid tests passed. Three failures were reproduced:

- A scroll 30 seconds after touchend revived feedback at the old finger position.
- A resize event with unchanged dimensions erased the wave field.
- A simulated 120 Hz display shaded the full field 120 times per second despite a roughly 60 Hz simulation.

After fixes: **29 of 29 tests pass**, including 19 liquid tests and 10 asset/cache checks. `git diff --check` passes.

The harness executes the actual production scripts with deterministic DOM, canvas, timer and animation-frame substitutes. Coverage includes subpixel reversals, concurrent fingers, pointer cancellation during touch, 100 rapid taps, click deduplication, passive input listeners, continuous momentum, idle expiration, blur/background cleanup, accessibility preferences, unavailable canvas, unchanged viewport, high-refresh render scheduling and wave settling. Asset checks cover four app pages, precache existence, root JavaScript and classic inline script syntax, and service-worker navigation/authentication cache rules.

Fixes preserve native scrolling. Continuous scroll events extend the current gesture; after an idle gap an old contact cannot restart feedback. Same-size resizes retain the field. Unchanged simulation frames reuse the canvas instead of repeating the expensive shading pass. Asset URLs and the service-worker cache move together to v205.

## What these tests do not prove

The canvas substitute records calculated pixels; it does not render browser graphics. Simulated 120 Hz verifies scheduling, **not iPhone frame rate**. Synthetic delivered touch events cannot prove that iOS delivers every physical finger sample during native momentum. Viewport size changes still rebuild the field. CSS/compositor performance, native multi-touch, Safari toolbar movement, background restoration and actual PWA updates require a real browser/device.

The supervised preview could not start: `sites-previewd mailbox is unavailable at /tmp/sites-previewd/requests`. No visual browser run was possible. The two supplied recordings were inspected, but neither establishes the location of each finger contact. Authenticated stock-list/admin workflows, live APIs, push delivery and production offline behavior have not been end-to-end tested.

Potential remaining performance concern: scrolling cards use backdrop-filter while a full-viewport CPU canvas runs. This has not been measured on-device; no unverified visual redesign was added to this patch.

## Required release checks (all still open)

Use Safari and the installed PWA on the affected iPhone. Record iOS version, device, build v205 and screen capture; use a camera or visible touch overlay to correlate finger input.

- Slow drag, fast flick, immediate reversal during momentum, repeated lift/re-touch, hold, and two fingers on blank space, cards, icons and controls. Confirm contact follows the actual finger without ghosts.
- Compare smoothness with effects disabled and enabled using device performance profiling, including a high-refresh display. Check large lists and 30 seconds of rapid scrolling.
- Stop touching and let momentum finish; wait 30 seconds, then scroll with a different input. Confirm old contact does not reappear.
- Rotate, expand/collapse Safari bars, focus an input/keyboard, background/resume, enable reduced motion/transparency. Confirm no broken layout or stuck overlays.
- Check header/title at narrow and large-text widths, ticker navigation, sorting, charts, login/logout, administration and position editing with a test account.
- Upgrade an existing v204 PWA to v205, reload, go offline/online and verify the loaded asset versions and absence of authentication-page caching.

Do not describe this candidate as fully tested or the iPhone scroll defect as resolved until those checks have passed.

## Follow-up: circle remaining after scroll

Three additional regression tests first failed on the previous candidate, then passed after this change. A missing touchend left the contact registered indefinitely. Scroll feedback also created a second decorative circle at the last known location.

The second circle and its looping CSS animation are removed. After scroll becomes idle for 180 ms and there have been no delivered contact samples for at least 120 ms, outstanding touch contacts are released. Subsequent delivered touchmove events re-establish feedback. The wave field can decay instead of receiving permanent held pressure.

This is a conservative cleanup heuristic, not detection of physical finger release: a finger held still after scrolling also relaxes until another movement arrives. Momentum impulses still use the last delivered coordinates; they do not establish a new finger position. Native events that Safari does not deliver cannot be reconstructed by these tests or by the visual effect. Actual iPhone scroll behavior remains unverified. No production release.
