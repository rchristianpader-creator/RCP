# Liquid feedback QA — v208, 2026-09-08

Baseline: production v204, commit 05d8e3502a07bf8ffe4a4eecd5667b2273121a37.
Release scope: code corrections verified by automated regression tests. Actual iPhone input delivery, visual quality and smoothness remain unverified; this is not complete device acceptance.

Run `npm test` using Node's built-in runner. No dependency installation required.

## Evidence and corrections

The supplied 14:18 recording was inspected as 15 sampled frames. It shows distinct bright contact rings over the moving stock list. Direct retrieval of the production touch script confirmed v204 still creates those overlays; the earlier v205 changes were only on the draft branch.

The complete `.liquid-contact` / `.liquid-contact-core` DOM overlay and all its CSS are now removed. Only the shared fluid canvas and existing component feedback remain. No overlay-removal timeout is needed.

Four new regressions failed before this correction and pass afterward:

- A fast swipe with touchstart and touchend, without an intermediate touchmove, discarded its final coordinates. We now consume changedTouches before releasing the contact; the test checks visible calculated pixels halfway along the path as well as the emitted final coordinates. Interpolation connects known samples; it does not reconstruct an unknown curved path.
- Touch cancellation discarded the last delivered coordinates as well. They now reach the solver before release.
- Tapping, dragging and scrolling created unwanted decorative ring elements. The router now creates no DOM nodes.
- Pen/mouse input discarded coalesced samples and the final pointerup position. Both now reach the solver. Touch input still uses authoritative Touch identifiers, avoiding duplicate touch/pointer handling.

The earlier regression fixes are included: stale contacts cannot restart unrelated scrolling; scroll idle releases untracked fingers when touchend is missing; same-size resize events preserve the wave field; and 120 Hz animation callbacks no longer shade the 60 Hz simulation twice per step.

## Automated result

**39/39 tests pass:** 29 input/simulation tests and 10 asset/cache checks. `git diff --check` passes. All four app pages and the service worker use v208 for the liquid assets.

Coverage includes subpixel reversals, multiple fingers, pointer cancellation during touch, 100 rapid taps, click deduplication, passive listeners, continuous momentum, idle expiration, blur/background cleanup, reduced motion/transparency, unavailable canvas, unchanged viewport, high-refresh scheduling, wave settling, sparse swipes and cancelled/released endpoints. Asset checks cover page references, precache existence, root JavaScript/classic inline syntax, and service-worker navigation/authentication cache rules.

The harness executes actual source scripts with deterministic DOM, canvas, timer and animation-frame substitutes. It records calculated pixels, not browser graphics. Simulated 120 Hz verifies scheduling, not measured iPhone FPS.

## Limits and open device checks

The supervised local preview could not start because the sites-previewd mailbox is unavailable. No browser visual acceptance or authenticated end-to-end run was possible.

If Safari does not deliver a physical contact sample, JavaScript has no measured coordinate for it. Native scrolling remains enabled. From v208, momentum alone cannot create new impulses at released or stale contact coordinates. The recording does not independently show the finger's actual location.

Scroll cleanup is conservative: after 180 ms of scroll idle and at least 120 ms without delivered contact samples, outstanding touch contacts are released. A finger held still after scrolling also relaxes until another delivered movement arrives. Actual viewport dimension changes still rebuild the wave field. Scrolling backdrop filters and the full-viewport CPU canvas require device profiling; their real frame rate has not been measured.

Required manual checks in Safari and the installed PWA:

- Slow drag, fast flick, immediate reversal during momentum, lift/re-touch, hold and two fingers over blank space, cards, icons and controls. Correlate a recording with visible finger input.
- Confirm no decorative circle during input or after settling. Confirm new motion resumes after idle cleanup.
- Compare smoothness with effects enabled/disabled, including 30 seconds of rapid scrolling and a high-refresh screen.
- Rotate, expand/collapse Safari bars, show the keyboard, background/resume and change accessibility preferences.
- Check header/title at narrow and large-text widths, ticker navigation, sorting, charts, login/logout, administration and position editing with a test account.
- Upgrade an existing v204 PWA to v206, reload, go offline/online and confirm asset versions and authentication cache behavior. Existing open pages require a reload to execute the new scripts.

Reference for final Touch coordinates: https://www.w3.org/community/reports/touchevents/CG-FINAL-touch-events-20240704/
Reference for coalesced pointer samples: https://www.w3.org/TR/pointerevents3/

## v207 — delayed scroll delivery

The 14:51 recording shows waves during parts of the scroll and absent reactions during others. It does not establish the scheduling of native events. We separately reproduced an application bug: the idle timeout discarded the gesture even when scrollY had already changed and the scroll event had not yet been delivered.

The input router now samples scrollY during animation frames for the current gesture and checks it before idle cleanup. A detected change extends the gesture and injects its scroll delta into the water field. Native scroll events and frame sampling share one last-position value, so the same delta is not counted twice. Sampling ends on idle, blur or hiding, and respects reduced motion/transparency. It never calls preventDefault or changes the page scroll position.

Three regression tests cover delayed scroll delivery across the cleanup deadline, scrolling observed via animation frames without a scroll event, and deduplication/blur cleanup. The first two failed on v206 before this change. The complete suite now passes 36 tests.

Limit: if WebKit suspends both animation callbacks and scroll-position updates visible to JavaScript, this cannot render new simulated frames during that suspension. Real iPhone frame timing remains unmeasured; the report does not claim that the recording's entire cause is proven or that every physical gesture is delivered.

## v208 — current contact coordinates only

Two further tests reproduced the user's stale-position report: when a new touch snapshot replaced an old contact lacking touchend, cleanup overwrote the new position with the old one; momentum also continued injecting at released coordinates. Both now pass, along with a third test covering stale contacts without touchend.

Contact records now retain their own ID and sample time. Releasing an old contact cannot replace the position of a different current contact. Scroll impulses use active contact records directly, not the cached click-deduplication position. If the latest sample for a contact is older than 120 ms when scroll movement is observed, that contact is released and generates no scroll impulse. Each concurrent current contact retains its own coordinates.

This intentionally supersedes the earlier behavior of injecting new waves throughout momentum after release. Existing waves still decay through the solver, but scroll distance alone cannot locate a new finger. If native touch samples are absent, new localized effects stop instead of appearing at an invented or old location. This is a correctness tradeoff, not a guarantee that iOS delivers every touch. The live iPhone location behavior remains unverified.

Tests for scroll-position sampling now retain current touch samples; the old test requiring released-finger momentum impulses was replaced with an explicit prohibition on those impulses. Complete suite: 39 passing tests.
