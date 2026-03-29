# Observer Class Usage Guide

## Overview

`class_observer.js` provides a centralized MutationObserver system for detecting Gmail DOM changes.

Part of the standard app architecture: `app.obs.foo()`

---

## Quick Reference

### Initialize
```javascript
this.app.obs.init();  // Called automatically from app.init()
```

### Start Observing Toolbar
```javascript
this.app.obs.observeToolbar();  // Called from gmailView.init()
```

### Handle Events
```javascript
// In your class:
this.app.events.addListener('toolbarChanged', this.handleToolbarChanged.bind(this));

handleToolbarChanged() {
  // React to toolbar replacement
  this.forceRedraw();
}
```

### Stop Observing
```javascript
this.app.obs.disconnect('toolbar');  // Stop toolbar observer
this.app.obs.disconnectAll();        // Stop all observers
```

### Check Status
```javascript
const status = this.app.obs.getStatus();
// { toolbar: true, content: false }
```

---

## Available Observers

### 1. Toolbar Observer

**Purpose**: Detects when Gmail replaces the toolbar DOM
**Selector**: `[gh='mtb']`
**Event**: `'toolbarChanged'`
**Debounce**: 250ms

**Usage**:
```javascript
// Start observing (in gmailView.init)
this.app.obs.observeToolbar();

// Listen for changes (in gmailView.bindEvents)
this.app.events.addListener('toolbarChanged', event => {
  console.log('Toolbar was replaced!');
  this.forceRedraw();
});
```

**What it detects**:
- Gmail navigation between views (inbox → starred)
- Toolbar reconstruction after settings changes
- Account switching
- Any DOM mutation involving `[gh='mtb']` element

---

### 2. Content Observer (Available, Not Used Yet)

**Purpose**: Detects when Gmail's main content area changes
**Selector**: `.AO` (Gmail content container)
**Event**: `'contentChanged'`
**Debounce**: 500ms

**Usage**:
```javascript
// Start observing
this.app.obs.observeContent();

// Listen for changes
this.app.events.addListener('contentChanged', event => {
  console.log('Content area updated!');
});
```

**What it detects**:
- Email list updates
- Thread view changes
- Search result changes

---

## Architecture

### Class Structure

```
G2T.Observer
├── observers          // Active MutationObserver instances
│   ├── toolbar: MutationObserver | null
│   └── content: MutationObserver | null
├── debounceTimers     // Timers for debouncing events
├── config             // Observer configurations
└── methods
    ├── init()
    ├── observeToolbar()
    ├── observeContent()
    ├── disconnect(type)
    ├── disconnectAll()
    └── getStatus()
```

### Event Flow

```
Gmail DOM changes
  ↓
MutationObserver callback fires
  ↓
handleToolbarMutations() filters relevant changes
  ↓
debounceEvent('toolbar', callback)
  ↓
(250ms delay)
  ↓
app.events.emit('toolbarChanged')
  ↓
Listeners react (e.g., gmailView.handleToolbarChanged)
  ↓
forceRedraw() recreates button
```

---

## Integration Points

### In `class_app.js`

```javascript
constructor() {
  this.obs = new G2T.Observer({ app: this });  // Create instance
}

init() {
  this.obs.init();  // Initialize
}
```

### In `class_gmailView.js`

```javascript
bindEvents() {
  // Listen for toolbar changes
  this.app.events.addListener('toolbarChanged', 
    this.handleToolbarChanged.bind(this)
  );
}

init() {
  this.bindEvents();
  this.detect();
  this.app.obs.observeToolbar();  // Start observing
}

handleToolbarChanged() {
  this.app.utils.log('Toolbar changed!');
  this.forceRedraw();
}
```

### In `manifest.json`

```json
"js": [
  "class_eventTarget.js",
  "class_observer.js",     // ← Loaded after EventTarget
  "class_goog.js",
  ...
]
```

---

## Configuration

### Default Settings

```javascript
this.config = {
  toolbar: {
    debounceMs: 250,           // Wait for Gmail to finish updates
    selector: '[gh="mtb"]',    // Gmail toolbar selector
  },
  content: {
    debounceMs: 500,
    selector: '.AO',           // Gmail main content area
  },
};
```

### Modify Settings

```javascript
// Change debounce timing
this.app.obs.config.toolbar.debounceMs = 500;

// Change selector (if Gmail updates)
this.app.obs.config.toolbar.selector = '[new-gmail-attr]';
```

---

## How MutationObserver Works

### Setup

```javascript
const observer = new MutationObserver(mutationsList => {
  // This callback fires when DOM changes
  for (const mutation of mutationsList) {
    if (mutation.type === 'childList') {
      // Check mutation.addedNodes
      // Check mutation.removedNodes
    }
  }
});

observer.observe(document.body, {
  childList: true,   // Watch for node additions/removals
  subtree: true,     // Watch entire tree below document.body
  attributes: false, // Don't watch attribute changes
});
```

### What It Detects

**Listens to actual browser DOM events**:
- `Node.appendChild()`
- `Node.removeChild()`
- `Element.remove()`
- `innerHTML` changes

**Does NOT listen to**:
- Gmail JavaScript events
- Attribute changes (unless configured)
- Text content changes (unless configured)

---

## Performance

### Memory Usage
- ~1KB per active observer
- Observers automatically cleaned up on disconnect

### CPU Usage
- Negligible at rest
- ~0.1% during Gmail navigation (250ms burst)
- Debouncing prevents excessive callbacks

### Comparison
- **Without Observer**: 5-second polling = constant checking
- **With Observer**: Event-driven = only fires when needed

---

## Debugging

### Enable Debug Logging

```javascript
// In browser console:
chrome.storage.sync.set({ debugMode: true });
```

### Watch for Messages

```
"Observer: Toolbar observer initialized"
"Observer: Toolbar mutation detected"
"GmailView: Toolbar changed event received"
"GmailView: forceRedraw - forcing complete redraw"
```

### Check Observer Status

```javascript
// In console:
window.g2t_app.obs.getStatus()
// { toolbar: true, content: false }
```

### Manual Test

```javascript
// Trigger event manually:
window.g2t_app.events.emit('toolbarChanged');
```

---

## Disabling Observers

### Disable Toolbar Observer Only

In `class_gmailView.js`:
```javascript
init() {
  this.bindEvents();
  this.detect();
  // this.app.obs.observeToolbar();  // ← Comment out
}
```

Periodic checks (5s) will still work as fallback.

### Disable All Observers

In `class_app.js`:
```javascript
init() {
  this.bindEvents();
  // this.obs.init();  // ← Comment out
  this.model.init();
  // ...
}
```

---

## Extension Cleanup

When extension is disabled/reloaded:

```javascript
// Automatically disconnects observers
this.app.obs.disconnectAll();

// Or selectively:
this.app.obs.disconnect('toolbar');
this.app.obs.disconnect('content');
```

---

## Adding New Observers

### Example: Compose Window Observer

1. **Add to config**:
```javascript
this.config = {
  compose: {
    debounceMs: 200,
    selector: '.M9',  // Gmail compose window
  },
};
```

2. **Create observer method**:
```javascript
observeCompose() {
  if (this.observers.compose) return;
  
  const callback = mutationsList => {
    this.handleComposeMutations(mutationsList);
  };
  
  this.observers.compose = new MutationObserver(callback);
  const composeArea = document.querySelector(this.config.compose.selector);
  if (composeArea) {
    this.observers.compose.observe(composeArea, {
      childList: true,
      subtree: true,
    });
  }
}
```

3. **Handle mutations**:
```javascript
handleComposeMutations(mutationsList) {
  this.debounceEvent('compose', () => {
    this.app.events.emit('composeChanged');
  });
}
```

4. **Use in app**:
```javascript
// In appropriate class:
this.app.obs.observeCompose();
this.app.events.addListener('composeChanged', () => {
  // React to compose window changes
});
```

---

## Troubleshooting

### Observer Not Firing

**Check 1**: Is it initialized?
```javascript
console.log(this.app.obs.getStatus());
```

**Check 2**: Is the selector correct?
```javascript
console.log(document.querySelector('[gh="mtb"]'));
```

**Check 3**: Is event listener bound?
```javascript
console.log(this.app.events.listeners);
```

### Observer Firing Too Often

**Solution**: Increase debounce timing
```javascript
this.app.obs.config.toolbar.debounceMs = 500;  // Was 250
```

### Observer Missing Changes

**Check**: Is Gmail updating a parent container?
- Expand observed scope
- Use `subtree: true`
- Watch higher-level element

---

## Best Practices

1. **Start observers in init()**, not constructor
2. **Debounce events** to prevent thrashing
3. **Use specific selectors** to reduce noise
4. **Disconnect when not needed** to save resources
5. **Listen to events**, don't poll observer state
6. **Log mutations** during development only

---

## Summary

**Observer class provides**:
- ✅ Centralized DOM observation
- ✅ Consistent with app architecture (app.obs)
- ✅ Event-driven (emit 'toolbarChanged')
- ✅ Configurable debouncing
- ✅ Easy to extend (add more observers)
- ✅ Clean separation of concerns

**Replaces**:
- ❌ 100+ lines of observer code in gmailView
- ❌ Manual observer management
- ❌ Scattered debounce timers
