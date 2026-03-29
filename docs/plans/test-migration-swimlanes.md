# Gmail-2-Trello: Test Migration Swimlanes

**Date**: 2026-03-29
**Status**: Active -- EventTarget spike complete, pattern proven
**Purpose**: Parallelization plan for migrating 505 Jest tests to node:test with Given/When/Then format, plus new tests for orchestrator and untested files.

---

## 0. What We Proved in the Spike

| Metric | Jest (old) | node:test (new) |
|--------|-----------|-----------------|
| EventTarget tests | 22 pass | 22 pass |
| Runtime | ~9s (with Jest overhead) | 288ms |
| Dependencies | jest, jest-environment-jsdom, jsdom (pinned) | jsdom (pinned) only |
| Format | describe/test/expect | describe/scenario/given/when/then |
| Mocks | jest.fn(), jest.spyOn() | mock.fn(), mock.method() |

**Key pattern discovered**: JSDOM creates objects in a separate JS realm. `assert.deepStrictEqual` fails on structurally identical objects across realms. Solution: `assertDeepEqual()` in test_utils.js tries strict first, falls back to JSON-normalized comparison. For objects with circular refs (like `app`), assert individual properties instead.

---

## 1. Reusable Patterns in test_utils.js

Everything below is already implemented in `tests/v2/test_utils.js`:

### Environment Setup (used by ALL test files)
- JSDOM + jQuery bootstrap
- G2T namespace loading via `loadSourceFile()`
- Chrome/Trello/browser mock factories: `createChromeMock()`, `createTrelloMock()`
- `installBrowserMocks()` -- reset all window.* mocks
- `createApp()` -- mock app factory with real Utils

### BDD Helpers (Given/When/Then)
- `scenario(name, fn)` -- sync Gherkin wrapper around `it()`
- `scenarioAsync(name, fn)` -- async variant
- Steps: `given()`, `when()`, `then()`, `and()`
- Error messages include step label: `[Given a fresh app] assertion failed`

### Assertion Helpers (replaces Jest expect)
| Jest | test_utils.js | Notes |
|------|--------------|-------|
| `expect(x).toBe(y)` | `assert.strictEqual(x, y)` | Reference equality |
| `expect(x).toEqual(y)` | `assertDeepEqual(x, y)` | Cross-realm safe |
| `expect(fn).toHaveBeenCalledWith(...)` | `assertCalledWith(fn, ...)` | |
| `expect(fn).toHaveBeenCalledTimes(n)` | `assertCallCount(fn, n)` | |
| `expect(fn).not.toHaveBeenCalled()` | `assertNotCalled(fn)` | |
| `expect(fn).toThrow(msg)` | `assertThrows(fn, msg)` | Supports string or RegExp |
| `expect(fn).not.toThrow()` | `assertNoThrow(fn)` | |
| `jest.fn()` | `mock.fn()` | |
| `jest.spyOn(obj, method)` | `mock.method(obj, method)` | |
| `jest.clearAllMocks()` | `resetMocks(obj)` | Per-object, not global |

---

## 2. Migration Swimlanes

Each lane is an independent test file migration that can run in parallel. No lane depends on another lane's completion. All lanes depend on `test_utils.js` (already done).

```
                          DEPENDENCIES
                               │
                     tests/v2/test_utils.js  ← DONE
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                     │
    ══════╪════════════════════╪═════════════════════╪═══════════════
    LANE A │              LANE B │              LANE C │
    Simple │              Medium │              Complex│
    classes│              classes│              views  │
    ══════╪════════════════════╪═════════════════════╪═══════════════
          │                    │                     │
    ┌─────┴──────┐      ┌─────┴──────┐       ┌──────┴───────┐
    │ EventTarget│      │    Model   │       │  PopupForm   │
    │  22 tests  │      │   55 tests │       │  16 tests    │
    │   DONE     │      │            │       │  + ~34 new   │
    └────────────┘      └────────────┘       └──────────────┘
    ┌────────────┐      ┌────────────┐       ┌──────────────┐
    │ WaitCounter│      │    Trel    │       │  PopupView   │
    │  8 tests   │      │  23 tests  │       │  16 tests    │
    │            │      │  + ~16 new │       │  + ~19 new   │
    └────────────┘      └────────────┘       └──────────────┘
    ┌────────────┐      ┌────────────┐       ┌──────────────┐
    │MenuControl │      │    Goog    │       │  GmailView   │
    │  12 tests  │      │  47 tests  │       │  34 tests    │
    │            │      │            │       │  + ~10 new   │
    └────────────┘      └────────────┘       └──────────────┘
    ┌────────────┐      ┌────────────┐
    │   Utils    │      │    App     │
    │  118 tests │      │  36 tests  │
    │  (biggest) │      │            │
    └────────────┘      └────────────┘

    ══════════════════════════════════════════════════════════════════
    LANE D: NEW FILES (no Jest equivalent, write fresh)
    ══════════════════════════════════════════════════════════════════
    ┌────────────┐      ┌────────────┐
    │ Observer   │      │Orchestrator│
    │  ~18 new   │      │  ~51 new   │
    │            │      │ (Wave 1)   │
    └────────────┘      └────────────┘
```

### Lane A: Simple Classes (4 files, ~160 tests)

Smallest classes, fewest mocks needed. Good warmup, highest parallel value.

| File | Old Tests | New Tests | Est. Time | Pattern |
|------|----------|----------|-----------|---------|
| `test_class_eventTarget.js` | 22 | 22 | DONE | Direct port |
| `test_class_waitCounter.js` | 8 | 8 | 30 min | Timer mocks: `mock.timers.enable()` |
| `test_class_menuControl.js` | 12 | 12 | 30 min | DOM interaction via jQuery |
| `test_class_utils.js` | 118 | 118 | 2 hr | Largest file, mostly data-driven. Mechanical port of markdownify cases. |

### Lane B: Medium Classes (4 files, ~161 tests)

More complex mocking, API interactions. Independent of Lane A.

| File | Old Tests | New Tests | Est. Time | Pattern |
|------|----------|----------|-----------|---------|
| `test_class_model.js` | 55 | 55 | 1.5 hr | Heavy mock.fn() usage, callback chains |
| `test_class_trel.js` | 23 | 23 + 16 new | 1.5 hr | Auth flow, add versioning + payload tests |
| `test_class_goog.js` | 47 | 47 | 1 hr | Chrome API mock patterns |
| `test_class_app.js` | 36 | 36 | 1 hr | App init, state management |

### Lane C: View Classes (3 files, ~66 existing + ~63 new tests)

Most complex -- jQuery DOM, form state, event cascades. Independent of Lanes A and B.

| File | Old Tests | New Tests | Est. Time | Pattern |
|------|----------|----------|-----------|---------|
| `test_class_popupForm.js` | 16 | 16 + 34 new | 2 hr | Form data assembly, hydration gates |
| `test_class_popupView.js` | 16 | 16 + 19 new | 1.5 hr | Popup lifecycle, dropdown handlers |
| `test_class_gmailView.js` | 34 | 34 + 10 new | 2 hr | parseData(), email extraction, fixtures |

### Lane D: New Files (no migration, fresh tests)

Can start immediately -- no old Jest file to port from. Independent of everything.

| File | Tests | Est. Time | Notes |
|------|-------|-----------|-------|
| `test_class_observer.js` | ~18 | 2 hr | Mock MutationObserver, test debouncing with fake timers |
| `test_class_orchestrator.js` | ~51 | 3-4 hr | Pure logic, no DOM. Depends on Wave 1 implementation code. |

---

## 3. Execution Order (What to Parallelize)

### Round 1 (all independent, do simultaneously)

```
  Agent 1          Agent 2          Agent 3          Agent 4
  ─────────        ─────────        ─────────        ─────────
  Lane A:          Lane B:          Lane C:          Lane D:
  WaitCounter      Model            PopupForm        Observer
  MenuControl      Trel             PopupView        (new file)
  Utils            Goog             GmailView
                   App
```

Each agent works from `test_utils.js` and the old Jest file as reference. No cross-dependencies.

### Round 2 (after orchestrator code is written)

```
  Agent 5
  ─────────
  Lane D:
  Orchestrator
  (new file, ~51 tests)
```

### Round 3 (verification)

```
  Run old Jest suite:  npx jest --silent
  Run new v2 suite:    node --test tests/v2/
  Compare:             test counts match per file, all green
```

Once verified, update `package.json` test script:

```json
"test": "node --test tests/v2/",
"test:legacy": "jest"
```

Keep legacy until full confidence, then remove Jest deps entirely.

---

## 4. Migration Patterns Cheat Sheet

### Basic Test
```javascript
// JEST:
test('should do something', () => {
  expect(result).toBe(42);
});

// NODE:TEST:
scenario('doing something', ({ when, then }) => {
  when('the operation runs', () => { /* ... */ });
  then('result is 42', () => { assert.strictEqual(result, 42); });
});
```

### Mock Function
```javascript
// JEST:
const fn = jest.fn();
expect(fn).toHaveBeenCalledWith('arg1');
expect(fn).toHaveBeenCalledTimes(1);

// NODE:TEST:
const fn = mock.fn();
assertCalledWith(fn, 'arg1');
assertCallCount(fn, 1);
```

### Spy on Method
```javascript
// JEST:
const spy = jest.spyOn(obj, 'method');
obj.method('arg');
expect(spy).toHaveBeenCalledWith('arg');
spy.mockRestore();

// NODE:TEST:
mock.method(obj, 'method');
obj.method('arg');
assertCalledWith(obj.method, 'arg');
obj.method.mock.restore();
```

### Timer Mocking
```javascript
// JEST:
jest.useFakeTimers();
setTimeout(callback, 1000);
jest.advanceTimersByTime(1000);
expect(callback).toHaveBeenCalled();

// NODE:TEST:
mock.timers.enable({ apis: ['setTimeout'] });
setTimeout(callback, 1000);
mock.timers.tick(1000);
assertCallCount(callback, 1);
mock.timers.reset();
```

### Cross-Realm Object Comparison
```javascript
// DANGER: Objects from JSDOM realm !== objects from Node realm
// even if structurally identical.

// BAD:
assert.deepStrictEqual(eventTarget._listeners, { click: [fn] });

// GOOD:
assertDeepEqual(eventTarget._listeners, { click: [fn] });

// GOOD (for objects containing circular refs like app):
assert.strictEqual(args[0].type, 'testEvent');
assert.strictEqual(args[0].target, eventTarget);
```

---

## 5. npm Scripts (Final State)

```json
{
  "test": "node --test tests/v2/",
  "test:coverage": "node --test --experimental-test-coverage tests/v2/",
  "test:legacy": "jest",
  "test:watch": "node --test --watch tests/v2/"
}
```

---

## 6. File Inventory

### New Files (tests/v2/)
| File | Status | Purpose |
|------|--------|---------|
| `test_utils.js` | DONE | Shared infra: JSDOM, mocks, BDD helpers, assertions |
| `test_class_eventTarget.js` | DONE (22 tests) | Spike / proof of concept |
| `test_class_waitCounter.js` | TODO | Lane A |
| `test_class_menuControl.js` | TODO | Lane A |
| `test_class_utils.js` | TODO | Lane A (biggest -- 118 tests) |
| `test_class_model.js` | TODO | Lane B |
| `test_class_trel.js` | TODO | Lane B (+ new versioning tests) |
| `test_class_goog.js` | TODO | Lane B |
| `test_class_app.js` | TODO | Lane B |
| `test_class_popupForm.js` | TODO | Lane C (+ ~34 new tests) |
| `test_class_popupView.js` | TODO | Lane C (+ ~19 new tests) |
| `test_class_gmailView.js` | TODO | Lane C (+ ~10 new tests) |
| `test_class_observer.js` | TODO | Lane D (new -- ~18 tests) |
| `test_class_orchestrator.js` | TODO | Lane D (new -- ~51 tests, after Wave 1 code) |

### Old Files (tests/) -- kept until migration verified
All 11 Jest test files remain unchanged. Removed only after Round 3 verification.
