# Gmail-2-Trello: Gmail.js Integration Plan

**Date**: 2026-03-29
**Status**: Design / Pre-implementation
**Depends on**: `swimlanes.md` (race condition analysis)
**Blocks**: `orchestrator.md` (event model changes affect race condition fix design)
**Purpose**: Replace the polling + MutationObserver approach with gmail.js event-driven detection, eliminating the 5-second `setInterval` and RACE-7.

---

## 1. Why

Today G2T uses two mechanisms to detect Gmail UI changes:

1. **MutationObserver** on `[gh="mtb"]` (toolbar) -- fires when Gmail replaces DOM, debounced 250ms
2. **setInterval(periodicChecks, 5000)** -- fallback poll that checks if the button is still in the DOM

The MutationObserver catches ~95% of changes. The 5-second poll catches the rest. But the poll:
- Keeps Node's event loop alive in tests (the `--test-force-exit` workaround)
- Can fire `popupLoaded` during init/redraw, duplicating event handlers (RACE-7)
- Burns CPU checking DOM every 5 seconds forever
- Has a 0-5 second blind spot where the button is missing

**Gmail.js** replaces both with actual events from Gmail's internal state. When Gmail finishes rendering a view, gmail.js fires an event. No guessing, no polling, no blind spots.

---

## 2. Gmail.js Overview

**Repo**: https://github.com/KartikTalwar/gmail.js
**Version**: 1.1.16
**Size**: ~165KB source (single file), jQuery required (we already have it)
**License**: MIT
**MV3**: Supported since Oct 2023
**Last pushed**: 2026-03-25 (4 days ago)
**Stars**: 3,800+

### Events We'd Use

| Gmail.js Event | Replaces | Fires When |
|---|---|---|
| `view_email` | MutationObserver toolbar detection | User opens/switches to an email |
| `load` | periodicChecks button recreation | Gmail finishes initial load |
| `open_email` | WaitCounter email click polling | Email thread opens |
| `compose` | (new capability) | Compose window opens |

### Data We'd Use

| Gmail.js API | Replaces | Current Approach |
|---|---|---|
| `gmail.get.email_subject()` | `$('.hP').text()` jQuery selector | Direct DOM scraping |
| `gmail.new.get.email_data()` | `parseData()` in GmailView | 80+ lines of DOM walking |
| `gmail.get.user_email()` | `inject.js` → GLOBALS[10] → CustomEvent | Script injection hack |
| `gmail.get.current_page()` | `window.location.hash` parsing | Hash change listener |

### Requirements

- Must be injected into page context (`world: 'MAIN'`), not content script context
- Must load before Gmail finishes rendering (`run_at: document_start`)
- Requires jQuery (already loaded)

---

## 3. Integration Architecture

### Current Flow

```
service_worker ──► content-script.js ──► app.init()
                                          ├─ obs.observeToolbar()    [MutationObserver]
                                          ├─ popupView.init()
                                          │   └─ setInterval(5000)   [polling]
                                          └─ inject.js               [GLOBALS hack]
```

### Proposed Flow

```
manifest.json ──► gmail.js loads (document_start, world: MAIN)
                  ├─ gmail.observe.on('load')  ──► app.handleGmailReady()
                  ├─ gmail.observe.on('view_email') ──► app.handleViewChange()
                  └─ gmail.get.user_email()    ──► app.model.userEmail

service_worker ──► content-script.js ──► app.init()
                                          ├─ gmail adapter binds events
                                          ├─ popupView.init()
                                          │   └─ NO setInterval
                                          └─ NO inject.js needed
```

### New Class: class_gmail.js (Adapter)

A thin adapter between gmail.js and our event system. Keeps gmail.js API out of our core classes.

```javascript
class Gmail {
  static get ck() { return { id: 'g2t_gmail' }; }
  get ck() { return Gmail.ck; }

  constructor({ app }) {
    this.app = app;
    this.gmail = null; // gmail.js instance
    this.ready = false;
  }

  init() {
    // gmail.js must be loaded in page context
    // Access via window.Gmail (injected by manifest)
    if (window.GmailFactory) {
      this.gmail = new window.GmailFactory.Gmail();
      this.bindEvents();
      this.ready = true;
    } else {
      this.app.utils.log('Gmail.js not available');
    }
  }

  bindEvents() {
    const g = this.gmail;

    // Gmail finished loading
    g.observe.on('load', () => {
      this.app.utils.log('Gmail: load event');
      this.app.events.emit('gmailLoaded');
    });

    // User navigated to an email
    g.observe.on('view_email', (domEmail) => {
      this.app.utils.log('Gmail: view_email event');
      this.app.events.emit('gmailViewChanged', { type: 'email', domEmail });
    });

    // User opened a thread
    g.observe.on('open_email', () => {
      this.app.utils.log('Gmail: open_email event');
      this.app.events.emit('gmailViewChanged', { type: 'thread' });
    });
  }

  // --- Data access wrappers ---

  getUserEmail() {
    return this.gmail?.get?.user_email() || null;
  }

  getEmailSubject() {
    return this.gmail?.get?.email_subject() || '';
  }

  getEmailData(identifier) {
    return this.gmail?.new?.get?.email_data(identifier) || null;
  }

  getCurrentPage() {
    return this.gmail?.get?.current_page() || '';
  }

  isInsideEmail() {
    return this.gmail?.check?.is_inside_email() || false;
  }
}

G2T.Gmail = Gmail;
```

---

## 4. What Changes

### Files Modified

| File | Change | Impact |
|---|---|---|
| `manifest.json` | Add gmail.js to content_scripts, add `world: 'MAIN'` script | Low risk |
| `class_app.js` | Create `this.gmail = new G2T.Gmail({ app: this })` | Low |
| `class_app.js` | Remove `bindGmailNavigationEvents()` hashchange listener | Medium |
| `views/class_popupView.js` | Remove `setInterval(periodicChecks, 5000)` | **High value** -- kills RACE-7 |
| `views/class_popupView.js` | Add listener for `gmailViewChanged` → button validation | Medium |
| `views/class_gmailView.js` | Optionally simplify `parseData()` to use gmail.js data API | Medium |
| `class_observer.js` | DELETE entirely -- no fallback, no observer | **High value** -- simplifies codebase |
| `content-script.js` | Remove `inject.js` injection, use gmail adapter for userEmail | Low |
| `inject.js` | Can be removed entirely (gmail.js provides GLOBALS access) | Low |

### Files Created

| File | Purpose |
|---|---|
| `class_gmail.js` | Adapter between gmail.js and G2T event system |
| `lib/gmail.min.js` | Gmail.js library (bundled, ~165KB) |

### Files Removed

| File | Reason |
|---|---|
| `inject.js` | gmail.js provides `get.user_email()` natively |

---

## 5. Manifest Changes

```json
{
  "content_scripts": [
    {
      "matches": ["https://mail.google.com/*"],
      "js": [
        "lib/jquery-3.7.1.min.js",
        "lib/gmail.min.js"
      ],
      "run_at": "document_start",
      "world": "MAIN"
    },
    {
      "matches": ["https://mail.google.com/*"],
      "js": [
        "lib/jquery-3.7.1.min.js",
        "lib/jquery-ui-1.14.1.min.js",
        "lib/trello.min.js",
        "lib/combo.js",
        "lib/google-analytics-bundle.min.js",
        "class_menuControl.js",
        "class_waitCounter.js",
        "class_eventTarget.js",
        "class_observer.js",
        "class_gmail.js",
        "class_goog.js",
        "class_trel.js",
        "views/class_gmailView.js",
        "views/class_popupForm.js",
        "views/class_popupView.js",
        "class_model.js",
        "class_utils.js",
        "class_app.js",
        "content-script.js"
      ],
      "css": [
        "lib/jquery-ui-1.14.1.min.css",
        "style.css"
      ]
    }
  ],
  "web_accessible_resources": [
    {
      "resources": [
        "lib/gmail.min.js",
        ...existing resources...
      ],
      "matches": ["<all_urls>"]
    }
  ]
}
```

**Key detail**: gmail.js runs in `world: "MAIN"` (page context) to access Gmail's internal state. Our content scripts run in the default isolated world. Communication happens through `window` (shared) or CustomEvent (like the current inject.js pattern).

---

## 6. The setInterval Elimination

### Before

```javascript
// class_popupView.js, init()
this.intervalId = setInterval(() => {
  this.periodicChecks();  // validate button, recreate if missing
}, 5000);
```

### After

```javascript
// class_popupView.js, init()
// No setInterval. Button recreation is event-driven.
this.app.events.addListener('gmailViewChanged', this.handleViewChanged.bind(this));
this.app.events.addListener('gmailLoaded', this.handleGmailLoaded.bind(this));

// ...

handleViewChanged(event, params) {
  // Gmail told us the view changed -- validate and recreate button
  this.validateButtonState();
  if (!this.$toolBar || !document.contains(this.$toolBar[0])) {
    this.handleDetectButton();
  }
}

handleGmailLoaded() {
  // Gmail finished initial load -- create button
  this.handleDetectButton();
}
```

**What we lose**: The 5-second safety net. If gmail.js fails to fire an event, we don't catch it.

**Decision**: No fallback. No observer, no polling. When gmail.js breaks (Gmail update), we update our vendored copy, same as we do for jQuery. This is the same maintenance model every gmail.js-based extension uses.

**Files deleted**:
- `class_observer.js` -- MutationObserver wrapper, no longer needed
- `inject.js` -- GLOBALS hack for user email, replaced by `gmail.get.user_email()`

Remove `setInterval` from PopupView entirely. Remove `class_observer.js` from manifest.json content_scripts.

---

## 7. Email Data Simplification

### Before (parseData in class_gmailView.js)

```javascript
parseData() {
  // 80+ lines of jQuery DOM scraping:
  const subject = $('.hP', this.$root).text();
  const body = $('.a3s.aiL', this.$root).html();
  const attachments = $('span.aZo', this.$root).map(...);
  const from = $('span.gD', this.$root).attr('email');
  // etc.
}
```

These selectors break when Gmail updates its DOM. `.a3s.aiL` has changed at least twice historically (see CHANGES.md: "Gmail changed class for mail body from '.a3s.aXjCH' to '.a3s.aiL'").

### After (optional -- can phase this in later)

```javascript
parseData() {
  if (this.app.gmail.ready) {
    const data = this.app.gmail.getEmailData();
    return {
      subject: data.subject,
      body: data.content_html,
      from: data.from,
      attachments: data.attachments,
      // ...map to our format
    };
  }
  // Fallback to DOM scraping
  return this.parseDataFromDOM();
}
```

**Recommendation**: Keep DOM scraping as `parseDataFromDOM()`, add gmail.js path as primary. If gmail.js data format changes, we update our vendored copy. Phase this in after the event system is working.

---

## 8. Implementation Phases

### Phase 1: Add gmail.js Library (est. 1 hour)
- [ ] Download gmail.js, create `lib/gmail.min.js`
- [ ] Add to manifest.json as `world: "MAIN"` content script
- [ ] Add to `web_accessible_resources`
- [ ] Verify it loads without errors on Gmail (manual test)

### Phase 2: Create Adapter (est. 2 hours)
- [ ] Create `chrome_manifest_v3/class_gmail.js`
- [ ] Add to manifest.json content_scripts (isolated world, after class_observer.js)
- [ ] Instantiate in `class_app.js` constructor
- [ ] Bridge: gmail.js events → G2T events via CustomEvent or window property
- [ ] Write tests: `tests/v2/test_class_gmail.js`

### Phase 3: Replace Polling (est. 2 hours)
- [ ] Remove `setInterval(periodicChecks, 5000)` from `class_popupView.js`
- [ ] Add `gmailViewChanged` and `gmailLoaded` listeners
- [ ] Implement fallback: if gmail.js not ready, use observer + 30s poll
- [ ] Update `class_app.js` init flow
- [ ] Run existing tests -- verify no regressions

### Phase 4: Replace inject.js (est. 1 hour)
- [ ] Use `gmail.get.user_email()` instead of GLOBALS[10] hack
- [ ] Remove `inject.js` injection from `content-script.js`
- [ ] Remove `inject.js` from `manifest.json` web_accessible_resources
- [ ] Delete `inject.js`

### Phase 5: Simplify GmailView (est. 2-3 hours, can defer)
- [ ] Add gmail.js data path to `parseData()`
- [ ] Keep DOM scraping as fallback
- [ ] Simplify `detectToolbar()` / `detectEmailOpeningMode()`
- [ ] Remove WaitCounter email click polling (gmail.js `open_email` replaces it)
- [ ] Update tests

### Phase 6: Manual Testing (est. 2 hours)
- [ ] Extension loads without errors
- [ ] Button appears after Gmail loads (no 5s delay)
- [ ] Button reappears instantly on navigation (Inbox → Starred → Sent)
- [ ] Button works after rapid navigation
- [ ] Email data extracts correctly
- [ ] Card creation works end-to-end
- [ ] Fallback works if gmail.js is blocked (disable the MAIN world script)

---

## 9. Communication Between Worlds

This is the trickiest part. Gmail.js runs in `world: "MAIN"` (page context). Our extension code runs in the isolated content script world. They share the DOM but not JavaScript globals.

### Option A: CustomEvent Bridge (recommended)

Same pattern as current `inject.js` → `g2t_connect_extension`:

```javascript
// In world: MAIN (gmail.js adapter loader)
const gmail = new Gmail();
gmail.observe.on('view_email', () => {
  document.dispatchEvent(new CustomEvent('g2t_gmail_event', {
    detail: { type: 'view_email', page: gmail.get.current_page() }
  }));
});

// In isolated world (class_gmail.js)
document.addEventListener('g2t_gmail_event', (e) => {
  this.app.events.emit('gmailViewChanged', e.detail);
});
```

**Pros**: Proven pattern (inject.js already does this), no shared global state.
**Cons**: Serialization overhead for large data (email bodies). But events are just signals -- data can be scraped from shared DOM on demand.

### Option B: Shared Window Property

```javascript
// In world: MAIN
window.__g2t_gmail_ready = true;
window.__g2t_gmail_page = gmail.get.current_page();

// In isolated world
if (window.__g2t_gmail_ready) { ... }
```

**Pros**: Simpler.
**Cons**: Shared mutable state, timing issues, no event notification.

### Recommendation: Option A (CustomEvent bridge)

We already have this pattern working. Create a small loader script that runs in MAIN world, initializes gmail.js, and bridges events to the content script via CustomEvent.

**New file**: `gmail_loader.js` (runs in MAIN world)

```javascript
// Loaded via manifest.json with world: "MAIN", run_at: "document_start"
(function() {
  // Wait for Gmail to initialize gmail.js
  // Gmail.js provides GmailFactory after DOM is ready
  const waitForGmail = setInterval(() => {
    if (typeof Gmail !== 'undefined' || typeof GmailFactory !== 'undefined') {
      clearInterval(waitForGmail);
      const Factory = typeof GmailFactory !== 'undefined' ? GmailFactory : { Gmail };
      const gmail = new Factory.Gmail();

      // Bridge events to content script world
      const emit = (type, data = {}) => {
        document.dispatchEvent(new CustomEvent('g2t_gmail_event', {
          detail: { type, ...data }
        }));
      };

      gmail.observe.on('load', () => emit('load'));
      gmail.observe.on('view_email', () => emit('view_email', {
        page: gmail.get.current_page(),
        subject: gmail.get.email_subject(),
      }));
      gmail.observe.on('open_email', () => emit('open_email'));

      // Signal that gmail.js is ready
      emit('ready', { userEmail: gmail.get.user_email() });
    }
  }, 100);

  // Give up after 30 seconds
  setTimeout(() => clearInterval(waitForGmail), 30000);
})();
```

---

## 10. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Gmail.js breaks on Gmail update | Medium | High | Update vendored copy, same as jQuery. Monitor gmail.js repo issues. |
| `world: "MAIN"` CSP blocked | Low | High | No fallback. Would require emergency update to re-add observer. Acceptable risk -- CSP for chrome extensions is stable. |
| gmail.js events fire late/miss | Low | Medium | No fallback. If events are unreliable, we update the vendored gmail.js. |
| Library size (165KB) | N/A | Low | Users already load 250KB+ of jQuery + jQuery UI |
| gmail.js API changes | Low | Medium | Adapter isolates our code from gmail.js API |

---

## 11. Impact on Race Condition Fixes

With gmail.js, RACE-7 (duplicate popupLoaded from periodicChecks) is **eliminated entirely**. There is no orchestrator class -- see `orchestrator.md` for the decision to use three targeted fixes instead.

**Gmail.js eliminates**:
- RACE-7: No more periodicChecks, no duplicate `popupLoaded` events
- The popup creation guard that an orchestrator would have needed

**Gmail.js does NOT affect** (these are fixed separately in Wave 2):
- RACE-2/RACE-3: Stale API responses -- fixed by version counter in `class_trel.js`
- RACE-5: Double submit -- fixed by submitting boolean in `class_popupForm.js`
- Board-change cascade -- fixed by completion tracker in `class_model.js`

---

## 12. Wave Order

```
Wave 0: Write all missing tests against current code (baseline)
  → Establish coverage before changing anything
  → See test-plan.md

Wave 1: Gmail.js integration (this plan, on a branch, not main)
  → Eliminate setInterval, class_observer.js, inject.js
  → Event-driven button management
  → Delete class_observer.js and inject.js

Wave 2: Targeted race condition fixes
  → Version counter in class_trel.js (RACE-2, RACE-3)
  → Submitting boolean in class_popupForm.js (RACE-5)
  → Completion tracker in class_model.js (board-change cascade)
  → No orchestrator class needed

Wave 3: Add-to-card feature

Wave 4: Ship prep
```

---

## 13. Open Questions

1. **Bundle or npm?** Gmail.js is 165KB source. Do we vendor it into `lib/` (like jQuery) or add as npm dependency? Vendor is simpler for a Chrome extension with no build step.

2. **Minified version?** Gmail.js doesn't ship a minified build. We'd either use it as-is or minify ourselves. At 165KB it's comparable to jQuery (87KB minified).

3. **Phase 5 timing?** Simplifying `parseData()` to use gmail.js data API is nice-to-have. Can defer until after add-to-card ships. The event integration (Phases 1-4) is the priority.
