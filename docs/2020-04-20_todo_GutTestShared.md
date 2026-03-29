# TODO: Gut test_shared.js

## Current State
- jQuery loading in JSDOM ✅
- Basic jQuery functionality ✅
- `anchorMarkdownify` tests passing ✅
- Simple element creation ✅

## Gutting Plan

### Phase 1: Remove Mock Constructors (lines 600-1000)
- [ ] Remove `createMockInstances()` function
- [ ] Remove `createG2TConstructor()` function  
- [ ] Remove `setupG2TMocks()` function
- [ ] Remove `createG2TNamespace()` function
- [ ] Remove `createMockJQuery()` function
- [ ] Remove `createMockJQueryElement()` function

### Phase 2: Remove Complex Element Mocks (lines 1000-1500)
- [ ] Remove `elementSuperSet()` function (already disabled)
- [ ] Remove complex `createMockJQueryElement()` function
- [ ] Remove unused mock element creation functions
- [ ] Clean up `g2t_element` definitions to use simple approach

### Phase 3: Remove Unused Utilities (lines 1500-2000)
- [ ] Remove `setupJSDOM()` function (redundant)
- [ ] Remove `cleanupJSDOM()` function
- [ ] Remove `setupUtilsForTesting()` function
- [ ] Remove `createRealUtilsMethods()` function
- [ ] Remove `setupModelForTesting()` function
- [ ] Remove `loadClassFile()` function

### Phase 4: Keep Core Functionality
- [ ] Keep jQuery + JSDOM setup (lines 1-80)
- [ ] Keep essential API mocks (Chrome, Trello, EventTarget)
- [ ] Keep simple `createJQueryElement()` function
- [ ] Keep simple `_element()` function
- [ ] Keep `g2t_element` definitions
- [ ] Keep `clearAllMocks()` function

### Phase 5: Final Cleanup
- [ ] Remove unused imports
- [ ] Clean up exports
- [ ] Update documentation
- [ ] Test that working functionality still works

## Target: Reduce from 2000+ lines to ~160 lines 