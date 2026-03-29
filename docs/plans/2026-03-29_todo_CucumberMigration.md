# Gmail-2-Trello: Cucumber Migration Plan

**Date**: 2026-03-29
**Status**: Design / Pre-implementation
**Depends on**: v2 node:test suite (523 tests passing)
**Purpose**: Migrate from custom `scenario()` helper to proper Cucumber with `.feature` files and reusable step definitions.

---

## 1. Why Cucumber

Our custom `scenario()` helper gives us Given/When/Then naming but:
- Step definitions are duplicated across files (same setup code written 9+ times)
- No `.feature` files (scenarios aren't readable without opening JS)
- No Scenario Outlines (data-driven tests require JS loops)
- No Background blocks (common setup repeated in every scenario)
- No step reuse (each file is self-contained)

Cucumber gives us all of that with one devDependency (`@cucumber/cucumber`).

---

## 2. Reusability Analysis

Analysis of 327 scenarios across 12 test files found:

**~35-40% of steps are reusable** across files:

| Shared Pattern | Files Using It | Example |
|---|---|---|
| Constructor + app dependency | 9 | `Given a fresh {className}` |
| ck getter verification | 11 | `Then ck.id is {value}` |
| Does not throw | 12 | `Then no error is thrown` |
| Property state assertion | 7 | `Then {property} is {value}` |
| Event binding verification | 7 | `Then addListener was called` |
| Method existence check | 6 | `Then {method} is a function` |
| No-arg constructor safety | 6 | `When constructed with empty object` |
| API call wrapping | 5 | `When wrapApiCall is called` |

**Key parameterizable patterns:**
- `Given a fresh {className}` -- replaces 9 different constructor setups
- `Then {property} is {value}` -- replaces 50+ state assertions
- `When load{entity}_success is called` -- replaces 6 Model data loading tests
- `Scenario Outline` with `Examples:` -- replaces JS loops for data-driven tests (Utils has 60+ markdownify cases)

---

## 3. File Structure

```
tests/
├── cucumber/
│   ├── cucumber.js                    # Config
│   ├── features/
│   │   ├── app.feature
│   │   ├── eventTarget.feature
│   │   ├── gmailView.feature
│   │   ├── goog.feature
│   │   ├── menuControl.feature
│   │   ├── model.feature
│   │   ├── observer.feature
│   │   ├── popupForm.feature
│   │   ├── popupView.feature
│   │   ├── trel.feature
│   │   ├── utils.feature
│   │   └── waitCounter.feature
│   ├── step_definitions/
│   │   ├── shared/
│   │   │   ├── construction.steps.js   # Given a fresh {className}, ck getters
│   │   │   ├── events.steps.js         # Event binding, emission, listener mgmt
│   │   │   ├── state.steps.js          # Property assertions, state verification
│   │   │   └── errors.steps.js         # Does not throw, error handling patterns
│   │   ├── app.steps.js
│   │   ├── eventTarget.steps.js
│   │   ├── gmailView.steps.js
│   │   ├── goog.steps.js
│   │   ├── menuControl.steps.js
│   │   ├── model.steps.js
│   │   ├── observer.steps.js
│   │   ├── popupForm.steps.js
│   │   ├── popupView.steps.js
│   │   ├── trel.steps.js
│   │   ├── utils.steps.js
│   │   └── waitCounter.steps.js
│   └── support/
│       ├── world.js                    # Custom World: JSDOM, jQuery, mocks, createApp
│       └── hooks.js                    # Before/After: setup, teardown, setInterval mock
├── v2/                                 # Keep until Cucumber is proven equivalent
│   └── (existing node:test files)
```

---

## 4. Custom World

Cucumber's World object replaces our `test_utils.js`. Each scenario gets a fresh World instance.

```javascript
// tests/cucumber/support/world.js
const { setWorldConstructor, World } = require('@cucumber/cucumber');
const { JSDOM } = require('jsdom');
const assert = require('node:assert/strict');

class G2TWorld extends World {
  constructor(options) {
    super(options);
    // JSDOM + jQuery setup (same as test_utils.js)
    this.dom = new JSDOM(htmlContent, { runScripts: 'dangerously', ... });
    this.window = this.dom.window;
    this.G2T = {};
    this.app = null;
    this.instance = null;  // The class instance under test
    this.result = null;     // Last operation result
    this.error = null;      // Last caught error
  }

  loadSourceFile(path) { /* same as test_utils.js */ }
  createApp() { /* same as test_utils.js */ }
  installBrowserMocks() { /* same as test_utils.js */ }
}

setWorldConstructor(G2TWorld);
```

---

## 5. Shared Step Examples

### construction.steps.js
```gherkin
# In feature files:
Given a fresh EventTarget
Given a fresh Trel
Given a fresh App

# Step definition (one definition serves all):
Given('a fresh {word}', function(className) {
  this.installBrowserMocks();
  this.app = this.createApp();
  // Load source file and create instance
  this.loadSourceFile(`chrome_manifest_v3/class_${className.toLowerCase()}.js`);
  this.instance = new this.G2T[className]({ app: this.app });
});
```

### state.steps.js
```gherkin
# In feature files:
Then persist.trelloAuthorized is true
Then persist.boardId is "test-board"
Then intervalId is 0

# Step definition:
Then('{word}.{word} is {string}', function(obj, prop, expected) {
  const actual = this.instance[obj]?.[prop] ?? this.app[obj]?.[prop];
  assert.strictEqual(String(actual), expected);
});

Then('{word} is {int}', function(prop, expected) {
  assert.strictEqual(this.instance[prop], expected);
});
```

### errors.steps.js
```gherkin
# In feature files:
Then no error is thrown
Then it throws an error matching "missing 'type' property"

# Step definitions:
Then('no error is thrown', function() {
  assert.strictEqual(this.error, null);
});

Then('it throws an error matching {string}', function(expected) {
  assert.ok(this.error, 'Expected an error but none was thrown');
  assert.ok(this.error.message.includes(expected));
});
```

---

## 6. Data-Driven Tests with Scenario Outline

The Utils markdownify tests (60+ cases) become clean tables:

```gherkin
Feature: Utils - Markdownify

  Scenario Outline: Converting HTML to Markdown
    Given a fresh Utils
    When markdownify is called with "<html>"
    Then the result is "<expected>"

    Examples:
      | html                          | expected              |
      | <b>bold</b>                   | **bold**              |
      | <i>italic</i>                 | *italic*              |
      | <a href="http://x">link</a>  | [link](http://x)      |
      | <h1>heading</h1>              | # heading             |
      # ... 60+ rows
```

This replaces 60 individual `scenario()` calls with one Scenario Outline and a table.

---

## 7. Swimlanes (Parallelizable Work)

```
PHASE 0: Foundation (sequential, one agent)
  ├── Install @cucumber/cucumber
  ├── Create cucumber.js config
  ├── Create support/world.js (port from test_utils.js)
  ├── Create support/hooks.js (Before/After, setInterval mock)
  └── Create shared step definitions (4 files)
      ├── construction.steps.js
      ├── events.steps.js
      ├── state.steps.js
      └── errors.steps.js

PHASE 1: Feature files + step definitions (4 parallel agents)
  ┌────────────────────┐  ┌────────────────────┐
  │ LANE A: Simple     │  │ LANE B: Medium     │
  │ eventTarget.feature│  │ app.feature        │
  │ waitCounter.feature│  │ goog.feature       │
  │ menuControl.feature│  │ trel.feature       │
  │ + step files       │  │ model.feature      │
  │                    │  │ + step files       │
  └────────────────────┘  └────────────────────┘
  ┌────────────────────┐  ┌────────────────────┐
  │ LANE C: Views      │  │ LANE D: Complex    │
  │ popupForm.feature  │  │ utils.feature      │
  │ popupView.feature  │  │ observer.feature   │
  │ gmailView.feature  │  │ + step files       │
  │ + step files       │  │                    │
  └────────────────────┘  └────────────────────┘

PHASE 2: Verification (sequential)
  ├── Run all Cucumber features
  ├── Compare scenario count: Cucumber >= node:test (523)
  ├── Run node:test v2 suite in parallel to confirm same results
  └── Update package.json test scripts

PHASE 3: Cleanup
  ├── Remove tests/v2/ (node:test files)
  ├── Remove scenario() helper from test_utils.js
  ├── Update docs/plans/test-plan.md
  └── Commit and push
```

### Phase 0 Detail: Foundation

**Must be done first** -- all lanes depend on the World, hooks, and shared steps.

| File | What | Est. |
|---|---|---|
| `cucumber.js` | Config: feature paths, step def paths, world | 15 min |
| `support/world.js` | JSDOM, jQuery, G2T namespace, createApp, mocks | 1 hr |
| `support/hooks.js` | Before: installBrowserMocks. After: clearInterval cleanup | 30 min |
| `shared/construction.steps.js` | `Given a fresh {className}`, ck getters, constructor patterns | 1 hr |
| `shared/events.steps.js` | addListener, emit, removeListener, bindEvents patterns | 45 min |
| `shared/state.steps.js` | Property assertions, state verification, collection checks | 45 min |
| `shared/errors.steps.js` | Does not throw, throws matching, error handling | 30 min |

**Est. total: ~4.5 hours. One agent, sequential.**

### Phase 1 Detail: Parallel Lanes

Each lane creates `.feature` files and component-specific `.steps.js` files. All lanes use the shared steps from Phase 0.

**Lane A** (Simple -- 3 files, ~36 scenarios):
- `eventTarget.feature` + `eventTarget.steps.js` (19 scenarios)
- `waitCounter.feature` + `waitCounter.steps.js` (5 scenarios)
- `menuControl.feature` + `menuControl.steps.js` (12 scenarios)

**Lane B** (Medium -- 4 files, ~141 scenarios):
- `app.feature` + `app.steps.js` (32 scenarios)
- `goog.feature` + `goog.steps.js` (47 scenarios)
- `trel.feature` + `trel.steps.js` (23 scenarios)
- `model.feature` + `model.steps.js` (76 scenarios -- largest, data-driven)

**Lane C** (Views -- 3 files, ~76 scenarios):
- `popupForm.feature` + `popupForm.steps.js` (14 scenarios)
- `popupView.feature` + `popupView.steps.js` (14 scenarios)
- `gmailView.feature` + `gmailView.steps.js` (50 scenarios)

**Lane D** (Complex data -- 2 files, ~228 scenarios):
- `utils.feature` + `utils.steps.js` (210 scenarios -- heavy Scenario Outline usage)
- `observer.feature` + `observer.steps.js` (18 scenarios)

---

## 8. Missing Tests (Write Before Gmail.js)

These are the gaps identified in test-plan.md. They get written as NEW Cucumber scenarios, not retrofitted into node:test.

| Component | New Scenarios | What They Cover |
|---|---|---|
| PopupForm | +34 | handleSubmit data assembly, updateLists/Cards/Labels/Members, hydration gates |
| PopupView | +19 | forceRedraw, periodicChecks, dropdown handlers, popup lifecycle |
| GmailView | +10 | parseData, attachment/image extraction |
| Trel | +16 | Payload verification, success/failure paths, createCard fields |
| Trel (race fix) | +8 | Version counter for stale response discard |
| PopupForm (race fix) | +3 | Submit guard (submitting boolean) |
| Model (race fix) | +6 | Board-change cascade completion tracking |

**Total: +96 new scenarios**

These go directly into the Cucumber `.feature` files during Phase 1. Each lane picks up the new scenarios for its components.

---

## 9. npm Scripts (Final State)

```json
{
  "test": "cucumber-js",
  "test:legacy": "node --test --test-force-exit tests/v2/test_class_*.js",
  "test:jest": "jest"
}
```

During migration, all three coexist. After verification:
```json
{
  "test": "cucumber-js",
  "test:v2": "node --test --test-force-exit tests/v2/test_class_*.js"
}
```

After cleanup:
```json
{
  "test": "cucumber-js"
}
```

---

## 10. Cucumber Config

```javascript
// tests/cucumber/cucumber.js
module.exports = {
  default: {
    paths: ['tests/cucumber/features/**/*.feature'],
    require: [
      'tests/cucumber/support/**/*.js',
      'tests/cucumber/step_definitions/**/*.js',
    ],
    format: ['progress-bar', 'html:coverage/cucumber-report.html'],
    publishQuiet: true,
  },
};
```

---

## 11. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Shared step name collisions | Medium | Low | Prefix with component name where ambiguous |
| JSDOM + Cucumber World interaction | Low | Medium | World.js tested in Phase 0 before lanes start |
| Data-driven table formatting | Low | Low | Scenario Outline well-documented in Cucumber |
| setInterval hang in Cucumber | Medium | Medium | After hook with clearInterval, same as node:test fix |
| Step count mismatch after migration | Low | High | Phase 2 explicitly compares counts |

---

## 12. Decision Log

| Decision | Rationale |
|---|---|
| Cucumber over custom scenario() | Step reuse (35-40%), .feature readability, Scenario Outline for data tables |
| Keep node:test v2 until proven | Safety net -- remove only after Cucumber count >= 523 |
| Shared steps in separate dir | 4 shared files serve 12 feature files, clear separation |
| World.js ports test_utils.js | Same JSDOM/mock setup, Cucumber lifecycle manages it |
| New tests go directly to Cucumber | No point writing node:test scenarios we'll immediately migrate |
| Phase 0 sequential, Phase 1 parallel | Shared steps must exist before lanes can use them |
