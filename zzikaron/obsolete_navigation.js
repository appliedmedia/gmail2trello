/**
 * Test file for Gmail navigation detection
 * This file can be used to test the navigation detection functionality
 */

// Test function to simulate Gmail navigation
function testGmailNavigation() {
  console.log('Testing Gmail navigation detection...');
  
  // Simulate hash change
  const originalHash = window.location.hash;
  window.location.hash = '#test-navigation';
  
  // Simulate popstate
  window.dispatchEvent(new PopStateEvent('popstate'));
  
  // Simulate click on navigation element
  const mockNavElement = document.createElement('div');
  mockNavElement.setAttribute('data-tooltip', 'Inbox');
  mockNavElement.setAttribute('role', 'navigation');
  document.body.appendChild(mockNavElement);
  
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  
  mockNavElement.dispatchEvent(clickEvent);
  
  // Clean up
  document.body.removeChild(mockNavElement);
  window.location.hash = originalHash;
  
  console.log('Navigation test completed');
}

// Test function to verify the app is properly initialized
function testAppInitialization() {
  console.log('Testing app initialization...');
  
  if (window.g2t_app) {
    console.log('✓ G2T app is initialized');
    console.log('✓ Gmail view:', window.g2t_app.gmailView);
    console.log('✓ Popup view:', window.g2t_app.popupView);
    console.log('✓ Navigation timeout:', window.g2t_app.navigationTimeout);
    console.log('✓ Navigation observer:', window.g2t_app.navigationObserver);
  } else {
    console.log('✗ G2T app is not initialized');
  }
}

// Test function to manually trigger navigation detection
function testManualNavigationDetection() {
  console.log('Testing manual navigation detection...');
  
  if (window.g2t_app && typeof window.g2t_app.handleGmailNavigation === 'function') {
    window.g2t_app.handleGmailNavigation();
    console.log('✓ Navigation detection triggered');
  } else {
    console.log('✗ Navigation detection not available');
  }
}

// Export test functions for use in console
window.testGmailNavigation = testGmailNavigation;
window.testAppInitialization = testAppInitialization;
window.testManualNavigationDetection = testManualNavigationDetection;

console.log('Gmail navigation tests loaded. Use:');
console.log('- testAppInitialization() to check app state');
console.log('- testGmailNavigation() to simulate navigation');
console.log('- testManualNavigationDetection() to trigger detection manually');