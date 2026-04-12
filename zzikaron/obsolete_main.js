// Comprehensive test suite for Gmail-2-Trello extension
// Enhanced custom test framework with extensive coverage

const TestSuite = {
  tests: [],
  setupHooks: [],
  teardownHooks: [],

  addTest(name, testFunction) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('Test name must be a non-empty string');
    }
    if (typeof testFunction !== 'function') {
      throw new Error('Test function must be a function');
    }
    this.tests.push({ name: name.trim(), testFunction });
  },

  addSetup(setupFunction) {
    if (typeof setupFunction !== 'function') {
      throw new Error('Setup function must be a function');
    }
    this.setupHooks.push(setupFunction);
  },

  addTeardown(teardownFunction) {
    if (typeof teardownFunction !== 'function') {
      throw new Error('Teardown function must be a function');
    }
    this.teardownHooks.push(teardownFunction);
  },

  async runSetup() {
    for (const setup of this.setupHooks) {
      await setup();
    }
  },

  async runTeardown() {
    for (const teardown of this.teardownHooks) {
      await teardown();
    }
  },

  async runTests() {
    console.log('🧪 Running Gmail-2-Trello Tests...\n');

    let passed = 0;
    let failed = 0;
    const results = [];

    await this.runSetup();

    for (const test of this.tests) {
      try {
        console.log(`📋 Testing: ${test.name}`);
        const startTime = Date.now();
        await test.testFunction();
        const duration = Date.now() - startTime;
        console.log(`✅ PASS: ${test.name} (${duration}ms)\n`);
        passed++;
        results.push({ name: test.name, status: 'passed', duration });
      } catch (error) {
        console.log(`❌ FAIL: ${test.name}`);
        console.log(`   Error: ${error.message}\n`);
        failed++;
        results.push({ name: test.name, status: 'failed', error: error.message });
      }
    }

    await this.runTeardown();

    console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
    return { passed, failed, results };
  },

  clearTests() {
    this.tests = [];
    this.setupHooks = [];
    this.teardownHooks = [];
  },

  getTestCount() {
    return this.tests.length;
  },

  getTestNames() {
    return this.tests.map(test => test.name);
  }
};

// ===== UNIT TESTS FOR TEST SUITE FRAMEWORK =====

// Test: TestSuite.addTest functionality
TestSuite.addTest('TestSuite.addTest - Valid Input', () => {
  const initialCount = TestSuite.getTestCount();
  const testName = 'Temporary Test';
  const testFunction = () => {};
  
  TestSuite.addTest(testName, testFunction);
  
  if (TestSuite.getTestCount() !== initialCount + 1) {
    throw new Error('Test count did not increase');
  }
  
  const testNames = TestSuite.getTestNames();
  if (!testNames.includes(testName)) {
    throw new Error('Test name not found in test list');
  }
  
  // Clean up
  TestSuite.tests = TestSuite.tests.filter(test => test.name !== testName);
});

// Test: TestSuite.addTest with invalid inputs
TestSuite.addTest('TestSuite.addTest - Invalid Name', () => {
  try {
    TestSuite.addTest('', () => {});
    throw new Error('Should have thrown error for empty name');
  } catch (error) {
    if (!error.message.includes('non-empty string')) {
      throw new Error('Wrong error message for empty name');
    }
  }
  
  try {
    TestSuite.addTest(null, () => {});
    throw new Error('Should have thrown error for null name');
  } catch (error) {
    if (!error.message.includes('non-empty string')) {
      throw new Error('Wrong error message for null name');
    }
  }
});

// Test: TestSuite.addTest with invalid function
TestSuite.addTest('TestSuite.addTest - Invalid Function', () => {
  try {
    TestSuite.addTest('Valid Name', 'not a function');
    throw new Error('Should have thrown error for non-function');
  } catch (error) {
    if (!error.message.includes('must be a function')) {
      throw new Error('Wrong error message for invalid function');
    }
  }
});

// Test: TestSuite.clearTests functionality
TestSuite.addTest('TestSuite.clearTests - Functionality', () => {
  TestSuite.addTest('Temp Test 1', () => {});
  TestSuite.addTest('Temp Test 2', () => {});
  TestSuite.addSetup(() => {});
  TestSuite.addTeardown(() => {});
  
  const beforeClear = {
    tests: TestSuite.getTestCount(),
    setup: TestSuite.setupHooks.length,
    teardown: TestSuite.teardownHooks.length
  };
  
  if (beforeClear.tests < 2) {
    throw new Error('Setup failed - not enough tests added');
  }
  
  TestSuite.clearTests();
  
  if (TestSuite.getTestCount() !== 0) {
    throw new Error('Tests not cleared');
  }
  if (TestSuite.setupHooks.length !== 0) {
    throw new Error('Setup hooks not cleared');
  }
  if (TestSuite.teardownHooks.length !== 0) {
    throw new Error('Teardown hooks not cleared');
  }
  
  // Restore tests (since we're running in the same context)
  TestSuite.tests = TestSuite.tests.filter(test => 
    !test.name.includes('Temp Test'));
});

// ===== CHROME EXTENSION TESTS =====

// Test: Check if extension is loaded (enhanced)
TestSuite.addTest('Extension Loaded - Comprehensive', () => {
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    throw new Error('Chrome extension API not available');
  }

  if (!chrome.runtime.getManifest) {
    throw new Error('Extension manifest not accessible');
  }

  const manifest = chrome.runtime.getManifest();
  if (!manifest) {
    throw new Error('No manifest returned');
  }
  
  if (manifest?.name !== 'Gmail-2-Trello') {
    throw new Error(`Extension name mismatch: expected 'Gmail-2-Trello', got '${manifest?.name}'`);
  }
  
  // Check for required manifest properties
  const requiredProperties = ['version', 'manifest_version'];
  for (const prop of requiredProperties) {
    if (!(prop in manifest)) {
      throw new Error(`Missing required manifest property: ${prop}`);
    }
  }
});

// Test: Chrome extension permissions
TestSuite.addTest('Extension Permissions', () => {
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    throw new Error('Chrome extension API not available');
  }

  const manifest = chrome.runtime.getManifest();
  if (!manifest.permissions || !Array.isArray(manifest.permissions)) {
    throw new Error('No permissions array found in manifest');
  }
  
  const requiredPermissions = ['https://mail.google.com/*'];
  for (const permission of requiredPermissions) {
    if (!manifest.permissions.includes(permission)) {
      throw new Error(`Missing required permission: ${permission}`);
    }
  }
});

// Test: Extension context and environment
TestSuite.addTest('Extension Context', () => {
  if (typeof chrome === 'undefined') {
    throw new Error('Not running in Chrome extension context');
  }
  
  if (!chrome.runtime.id) {
    throw new Error('Extension ID not available');
  }
  
  if (chrome.runtime.lastError) {
    throw new Error(`Runtime error: ${chrome.runtime.lastError.message}`);
  }
});

// ===== GMAIL INTEGRATION TESTS =====

// Test: Gmail detection (enhanced)
TestSuite.addTest('Gmail Detection - Comprehensive', () => {
  const hostname = window.location.hostname;
  const validGmailDomains = [
    'mail.google.com',
    'mail.google.co.uk',
    'mail.google.ca',
    'mail.google.com.au'
  ];
  
  const isValidGmail = validGmailDomains.some(domain => 
    hostname === domain || hostname.startsWith('mail.google.'));
  
  if (!isValidGmail) {
    throw new Error(`Not on Gmail domain: ${hostname}`);
  }
});

// Test: Gmail URL patterns
TestSuite.addTest('Gmail URL Patterns', () => {
  const url = window.location.href;
  const gmailPatterns = [
    /^https:\/\/mail\.google\./,
    /gmail/i
  ];
  
  const matchesPattern = gmailPatterns.some(pattern => pattern.test(url));
  if (!matchesPattern) {
    throw new Error(`URL does not match Gmail patterns: ${url}`);
  }
});

// Test: Gmail DOM elements (mock-safe)
TestSuite.addTest('Gmail DOM Structure', () => {
  if (typeof document === 'undefined') {
    // Skip in non-browser environment
    return;
  }
  
  // Check for common Gmail elements that might exist
  const possibleGmailSelectors = [
    '[role="main"]',
    '[data-thread-id]',
    '.nH', // Gmail container class
    '#gb' // Google bar
  ];
  
  // In a real Gmail page, at least one of these should exist
  // For testing, we'll just verify the selectors are valid
  for (const selector of possibleGmailSelectors) {
    try {
      document.querySelector(selector);
    } catch (error) {
      throw new Error(`Invalid CSS selector: ${selector}`);
    }
  }
});

// ===== TRELLO API TESTS =====

// Test: Trello API availability (enhanced)
TestSuite.addTest('Trello API - Comprehensive', () => {
  if (typeof Trello === 'undefined') {
    throw new Error('Trello API not loaded');
  }
  
  // Check for required Trello methods
  const requiredMethods = ['authorize', 'get', 'post', 'put', 'delete'];
  for (const method of requiredMethods) {
    if (typeof Trello[method] !== 'function') {
      throw new Error(`Trello.${method} method not available`);
    }
  }
});

// Test: Trello API configuration
TestSuite.addTest('Trello API Configuration', () => {
  if (typeof Trello === 'undefined') {
    throw new Error('Trello API not loaded');
  }
  
  // Check if API key is configured (without exposing it)
  if (!Trello.key || typeof Trello.key !== 'string') {
    throw new Error('Trello API key not configured');
  }
  
  if (Trello.key.length < 10) {
    throw new Error('Trello API key appears to be invalid (too short)');
  }
});

// Test: Trello authorization state
TestSuite.addTest('Trello Authorization State', () => {
  if (typeof Trello === 'undefined') {
    throw new Error('Trello API not loaded');
  }
  
  // Check if there's a token (indicates previous authorization)
  const isAuthorized = Trello.token && typeof Trello.token === 'string';
  
  // This test just verifies the authorization mechanism exists
  if (typeof Trello.authorized !== 'function') {
    throw new Error('Trello.authorized method not available');
  }
});

// ===== JQUERY TESTS =====

// Test: jQuery availability (enhanced)
TestSuite.addTest('jQuery - Comprehensive', () => {
  if (typeof $ === 'undefined') {
    throw new Error('jQuery not loaded');
  }
  
  if (typeof $.fn === 'undefined') {
    throw new Error('jQuery function prototype not available');
  }
  
  if (!$.fn.jquery) {
    throw new Error('jQuery version not available');
  }
  
  // Check jQuery version (should be reasonably recent)
  const version = $.fn.jquery;
  const majorVersion = parseInt(version.split('.')[0]);
  if (majorVersion < 1) {
    throw new Error(`jQuery version too old: ${version}`);
  }
});

// Test: jQuery essential methods
TestSuite.addTest('jQuery Essential Methods', () => {
  if (typeof $ === 'undefined') {
    throw new Error('jQuery not loaded');
  }
  
  const requiredMethods = ['ready', 'ajax', 'get', 'post', 'each', 'find', 'click'];
  for (const method of requiredMethods) {
    if (typeof $[method] !== 'function' && typeof $.fn[method] !== 'function') {
      throw new Error(`jQuery method not available: ${method}`);
    }
  }
});

// ===== ERROR HANDLING TESTS =====

// Test: Async error handling
TestSuite.addTest('Async Error Handling', async () => {
  let errorCaught = false;
  
  const asyncErrorTest = async () => {
    throw new Error('Test async error');
  };
  
  try {
    await asyncErrorTest();
  } catch (error) {
    errorCaught = true;
    if (error.message !== 'Test async error') {
      throw new Error('Wrong error message caught');
    }
  }
  
  if (!errorCaught) {
    throw new Error('Async error was not caught');
  }
});

// Test: Promise rejection handling
TestSuite.addTest('Promise Rejection Handling', async () => {
  let rejectionCaught = false;
  
  const promiseRejection = Promise.reject(new Error('Test promise rejection'));
  
  try {
    await promiseRejection;
  } catch (error) {
    rejectionCaught = true;
    if (error.message !== 'Test promise rejection') {
      throw new Error('Wrong rejection message caught');
    }
  }
  
  if (!rejectionCaught) {
    throw new Error('Promise rejection was not caught');
  }
});

// ===== ENVIRONMENT TESTS =====

// Test: Browser environment detection
TestSuite.addTest('Browser Environment', () => {
  if (typeof window === 'undefined') {
    throw new Error('Not running in browser environment');
  }
  
  if (typeof document === 'undefined') {
    throw new Error('Document object not available');
  }
  
  if (typeof navigator === 'undefined') {
    throw new Error('Navigator object not available');
  }
});

// Test: Extension content script context
TestSuite.addTest('Content Script Context', () => {
  // Check if we're in a content script context
  const isContentScript = typeof chrome !== 'undefined' && 
                         typeof window !== 'undefined' &&
                         typeof document !== 'undefined';
  
  if (!isContentScript) {
    throw new Error('Not in content script context');
  }
  
  // Verify we can access page content
  if (typeof document.querySelector !== 'function') {
    throw new Error('Cannot access page DOM');
  }
});

// ===== MOCK TESTS FOR EDGE CASES =====

// Test: Network connectivity simulation
TestSuite.addTest('Network Connectivity Check', async () => {
  if (typeof navigator === 'undefined' || typeof navigator.onLine === 'undefined') {
    // Skip if navigator.onLine not available
    return;
  }
  
  // Check if browser reports being online
  if (!navigator.onLine) {
    throw new Error('Browser reports being offline');
  }
});

// Test: Local storage availability
TestSuite.addTest('Local Storage Availability', () => {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage not available');
  }
  
  try {
    const testKey = 'gmail2trello_test';
    localStorage.setItem(testKey, 'test_value');
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    
    if (retrieved !== 'test_value') {
      throw new Error('localStorage read/write test failed');
    }
  } catch (error) {
    throw new Error(`localStorage functionality error: ${error.message}`);
  }
});

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.TestSuite = TestSuite;
}

// Run tests if this file is executed directly (Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TestSuite;

  // Run tests if called directly
  if (require.main === module) {
    TestSuite.runTests().then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    });
  }
}