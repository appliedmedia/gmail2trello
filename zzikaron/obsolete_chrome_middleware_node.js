#!/usr/bin/env node

// Node.js test script for Chrome middleware
// Tests the structure and logic of the Chrome class

const fs = require('node:fs');
const path = require('node:path');

console.log('🧪 Testing Chrome Middleware (Node.js)...\n');

// Test 1: Check if Chrome class file exists
function testChromeFileExists() {
  console.log('📋 Test 1: Chrome class file exists');

  const chromeFile = path.join(
    __dirname,
    '../chrome_manifest_v3/class_chrome.js'
  );
  if (fs.existsSync(chromeFile)) {
    console.log('✅ class_chrome.js file exists');
    return true;
  } else {
    console.log('❌ class_chrome.js file not found');
    return false;
  }
}

// Test 2: Check Chrome class structure
function testChromeClassStructure() {
  console.log('📋 Test 2: Chrome class structure');

  const chromeFile = path.join(
    __dirname,
    '../chrome_manifest_v3/class_chrome.js'
  );
  
  let content;
  try {
    content = fs.readFileSync(chromeFile, 'utf8');
  } catch (error) {
    console.log('❌ Failed to read Chrome class file');
    return false;
  }

  const checks = {
    hasClassDeclaration: content.includes('class Chrome'),
    hasStaticCk: content.includes('static get ck()'),
    hasGetCk: content.includes('get ck()'),
    hasConstructor: content.includes('constructor('),
    hasWrapApiCall: content.includes('wrapApiCall'),
    hasHandleChromeError: content.includes('handleChromeError'),
    hasShowContextInvalidMessage: content.includes('showContextInvalidMessage'),
    hasStorageSyncGet: content.includes('storageSyncGet'),
    hasStorageSyncSet: content.includes('storageSyncSet'),
    hasRuntimeSendMessage: content.includes('runtimeSendMessage'),
    hasRuntimeGetURL: content.includes('runtimeGetURL'),
    hasG2TNamespace: content.includes('G2T.ChromeAPI = ChromeAPI'),
    hasContextInvalidError: content.includes('Extension context invalidated'),
    hasReloadMessage: content.includes('Please reload the extension'),
    hasErrorPrefix: content.includes('Chrome API Error:'),
  };

  let passed = 0;
  const total = Object.keys(checks).length;

  Object.entries(checks).forEach(([check, result]) => {
    if (result) {
      console.log(`✅ ${check}`);
      passed++;
    } else {
      console.log(`❌ ${check}`);
    }
  });

  console.log(`\n📊 Structure test: ${passed}/${total} checks passed`);
  return passed === total;
}

// Test 3: Check manifest includes Chrome class
function testManifestIncludesChrome() {
  console.log('📋 Test 3: Manifest includes Chrome class');

  const manifestFile = path.join(
    __dirname,
    '../chrome_manifest_v3/manifest.json'
  );
  
  let content;
  try {
    content = fs.readFileSync(manifestFile, 'utf8');
  } catch (error) {
    console.log('❌ Failed to read manifest file');
    return false;
  }

  if (content.includes('class_chrome.js')) {
    console.log('✅ class_chrome.js included in manifest');
    return true;
  } else {
    console.log('❌ class_chrome.js not found in manifest');
    return false;
  }
}

// Test 4: Check App class includes Chrome instance
function testAppIncludesChrome() {
  console.log('📋 Test 4: App class includes Chrome instance');

  const appFile = path.join(__dirname, '../chrome_manifest_v3/class_app.js');
  
  let content;
  try {
    content = fs.readFileSync(appFile, 'utf8');
  } catch (error) {
    console.log('❌ Failed to read App class file');
    return false;
  }

  const checks = {
    hasChromeInstance: content.includes('this.chrome = new G2T.ChromeAPI'),
    hasChromeInit: content.includes('this.chrome.init()') === false, // Should be removed
    hasChromeReference: content.includes('this.chrome'),
  };

  let passed = 0;
  const total = Object.keys(checks).length;

  Object.entries(checks).forEach(([check, result]) => {
    if (result) {
      console.log(`✅ ${check}`);
      passed++;
    } else {
      console.log(`❌ ${check}`);
    }
  });

  console.log(`\n📊 App integration test: ${passed}/${total} checks passed`);
  return passed === total;
}

// Test 5: Check for proper error handling patterns
function testErrorHandlingPatterns() {
  console.log('📋 Test 5: Error handling patterns');

  const chromeFile = path.join(
    __dirname,
    '../chrome_manifest_v3/class_chrome.js'
  );
  
  let content;
  try {
    content = fs.readFileSync(chromeFile, 'utf8');
  } catch (error) {
    console.log('❌ Failed to read Chrome class file');
    return false;
  }

  const checks = {
    hasTryCatch:
      content.includes('try {') && content.includes('} catch (error)'),
    hasContextInvalidCheck: content.includes('contextInvalidError'),
    hasG2tLog: content.includes('g2t_log'),
    hasPopupCheck: content.includes(
      'this.app?.popupView?.displayExtensionInvalidReload'
    ),
    hasFallbackNotification: content.includes('document.createElement'),
  };

  let passed = 0;
  const total = Object.keys(checks).length;

  Object.entries(checks).forEach(([check, result]) => {
    if (result) {
      console.log(`✅ ${check}`);
      passed++;
    } else {
      console.log(`❌ ${check}`);
    }
  });

  console.log(`\n📊 Error handling test: ${passed}/${total} checks passed`);
  return passed === total;
}

// Test 6: Check for callback-based API wrappers
function testCallbackBasedWrappers() {
  console.log('📋 Test 6: Callback-based API wrappers');

  const chromeFile = path.join(
    __dirname,
    '../chrome_manifest_v3/class_chrome.js'
  );
  
  let content;
  try {
    content = fs.readFileSync(chromeFile, 'utf8');
  } catch (error) {
    console.log('❌ Failed to read Chrome class file');
    return false;
  }

  const checks = {
    noAsyncStorage: !content.includes('async storageSyncGet'),
    noAsyncRuntime: !content.includes('async runtimeSendMessage'),
    hasCallbackParams: content.includes('callback)'),
    hasChromeCallback: content.includes('chrome.storage.sync.get(keys, cb)'),
    hasChromeCallback2: content.includes(
      'chrome.runtime.sendMessage(message, cb)'
    ),
  };

  let passed = 0;
  const total = Object.keys(checks).length;

  Object.entries(checks).forEach(([check, result]) => {
    if (result) {
      console.log(`✅ ${check}`);
      passed++;
    } else {
      console.log(`❌ ${check}`);
    }
  });

  console.log(`\n📊 Callback test: ${passed}/${total} checks passed`);
  return passed === total;
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting Chrome Middleware Node.js Tests...\n');

  const results = {
    fileExists: testChromeFileExists(),
    structure: testChromeClassStructure(),
    manifest: testManifestIncludesChrome(),
    appIntegration: testAppIncludesChrome(),
    errorHandling: testErrorHandlingPatterns(),
    callbacks: testCallbackBasedWrappers(),
  };

  console.log('\n📊 Final Test Results:');
  console.log('=====================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log(`\n🎯 Summary: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All tests passed! Chrome middleware structure is correct.');
    console.log('\n💡 Next steps:');
    console.log('   1. Load extension in Chrome');
    console.log('   2. Open Gmail');
    console.log('   3. Run browser tests in console');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testChromeFileExists,
  testChromeClassStructure,
  testManifestIncludesChrome,
  testAppIncludesChrome,
  testErrorHandlingPatterns,
  testCallbackBasedWrappers,
};
