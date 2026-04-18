// Test script for Chrome middleware
// Run this in the browser console on Gmail page

console.log('🧪 Testing Chrome Middleware...');

// Test 1: Check if Chrome class is available
function testChromeClassAvailability() {
  console.log('📋 Test 1: Chrome class availability');

  if (typeof G2T !== 'undefined' && G2T.ChromeAPI) {
    console.log('✅ G2T.ChromeAPI class exists');
    return true;
  } else {
    console.log('❌ G2T.ChromeAPI class not found');
    return false;
  }
}

// Test 2: Check if Chrome instance is available in App
function testChromeInstance() {
  console.log('📋 Test 2: Chrome instance in App');

  if (typeof G2T !== 'undefined' && G2T.App && window.g2t_app?.chrome) {
    console.log('✅ Chrome instance available in app');
    return true;
  } else {
    console.log('❌ Chrome instance not found in app');
    return false;
  }
}

// Test 3: Test runtimeGetURL wrapper
function testRuntimeGetURL() {
  console.log('📋 Test 3: runtimeGetURL wrapper');

  try {
    const result = window.g2t_app.chrome.runtimeGetURL('images/icon-48.png');
    console.log('✅ runtimeGetURL result:', result);
    return true;
  } catch (error) {
    console.log('❌ runtimeGetURL failed:', error);
    return false;
  }
}

// Test 4: Test storage wrapper (with callback)
function testStorageWrapper() {
  console.log('📋 Test 4: Storage wrapper');

  return new Promise(resolve => {
    try {
      window.g2t_app.chrome.storageSyncGet('debugMode', result => {
        console.log('✅ storageSyncGet result:', result);
        resolve(true);
      });
    } catch (error) {
      console.log('❌ storageSyncGet failed:', error);
      resolve(false);
    }
  });
}

// Test 5: Test error handling (simulate context invalidation)
function testErrorHandling() {
  console.log('📋 Test 5: Error handling');

  try {
    // Simulate context invalidation error
    const error = new Error('Extension context invalidated.');
    window.g2t_app.chrome.handleChromeError(error, 'test operation');
    console.log('✅ Error handling works');
    return true;
  } catch (error) {
    console.log('❌ Error handling failed:', error);
    return false;
  }
}

// Test 6: Test popup integration
function testPopupIntegration() {
  console.log('📋 Test 6: Popup integration');

  try {
    // Check if popup is available
    const hasPopup = window.g2t_app?.popupView?.displayExtensionInvalidReload;
    console.log(
      '✅ Popup integration check:',
      hasPopup ? 'Available' : 'Not available'
    );
    return hasPopup;
  } catch (error) {
    console.log('❌ Popup integration failed:', error);
    return false;
  }
}

// Test 7: Test showContextInvalidMessage
function testShowContextInvalidMessage() {
  console.log('📋 Test 7: Show context invalid message');

  try {
    window.g2t_app.chrome.showContextInvalidMessage();
    console.log('✅ showContextInvalidMessage executed');
    return true;
  } catch (error) {
    console.log('❌ showContextInvalidMessage failed:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Chrome Middleware Tests...\n');

  const results = {
    chromeClass: testChromeClassAvailability(),
    chromeInstance: testChromeInstance(),
    runtimeGetURL: testRuntimeGetURL(),
    storageWrapper: await testStorageWrapper(),
    errorHandling: testErrorHandling(),
    popupIntegration: testPopupIntegration(),
    showMessage: testShowContextInvalidMessage(),
  };

  console.log('\n📊 Test Results:');
  console.log('================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log(`\n🎯 Summary: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All tests passed! Chrome middleware is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
  }
}

// Export for manual testing
window.testChromeMiddleware = {
  runAllTests,
  testChromeClassAvailability,
  testChromeInstance,
  testRuntimeGetURL,
  testStorageWrapper,
  testErrorHandling,
  testPopupIntegration,
  testShowContextInvalidMessage,
};

console.log('🧪 Chrome middleware test script loaded.');
console.log('Run: testChromeMiddleware.runAllTests() to execute all tests');
