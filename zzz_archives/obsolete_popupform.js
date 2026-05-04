const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Create a mock DOM first
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head></head>
<body>
  <div id="g2tPopup">
    <form id="g2tForm">
      <select id="g2tBoard">
        <option value="">Select a board...</option>
        <option value="board1">Board 1</option>
        <option value="board2">Board 2</option>
      </select>
      <select id="g2tList">
        <option value="">Select a list...</option>
        <option value="list1">List 1</option>
        <option value="list2">List 2</option>
      </select>
      <input type="text" id="g2tCardName" value="Test Card" />
      <textarea id="g2tCardDesc">Test Description</textarea>
      <div id="g2tLabels"></div>
      <div id="g2tMembers"></div>
      <button type="submit" id="g2tSubmit">Submit</button>
    </form>
  </div>
</body>
</html>
`);

global.window = dom.window;
global.document = dom.window.document;

// Mock jQuery and global functions
global.$ = global.jQuery = require('jquery');
global.g2t_each = function (obj, callback) {
  Object.keys(obj).forEach(key => {
    callback(obj[key], key);
  });
};
global.g2t_log = console.log;

// Mock jQuery combobox plugin
$.fn.combobox = function () {
  return this;
};

// Mock chrome API
global.chrome = {
  runtime: {
    getURL: url => `chrome-extension://mock/${url}`,
  },
  storage: {
    sync: {
      get: (key, callback) => {
        callback({ dueShortcuts: '{}' });
      },
    },
  },
};

// Mock G2T namespace
global.G2T = {};

// Load the PopupForm class
const popupFormPath = path.join(
  __dirname,
  '../chrome_manifest_v3/views/class_popupForm.js'
);
const popupFormCode = fs.readFileSync(popupFormPath, 'utf8');

// Mock parent PopupView
const mockParent = {
  state: {
    boardId: '',
    listId: '',
    cardName: '',
    cardDesc: '',
    trello: {
      boards: [
        { id: 'board1', name: 'Board 1' },
        { id: 'board2', name: 'Board 2' },
      ],
      lists: [
        { id: 'list1', name: 'List 1' },
        { id: 'list2', name: 'List 2' },
      ],
      cards: [
        { id: 'card1', name: 'Card 1' },
        { id: 'card2', name: 'Card 2' },
      ],
      labels: [
        { id: 'label1', name: 'Label 1', color: '#ff0000' },
        { id: 'label2', name: 'Label 2', color: '#00ff00' },
      ],
      members: [
        {
          id: 'member1',
          fullName: 'Member 1',
          username: 'member1',
          initials: 'M1',
        },
        {
          id: 'member2',
          fullName: 'Member 2',
          username: 'member2',
          initials: 'M2',
        },
      ],
    },
  },
  $popup: $('#g2tPopup'),
  $popupMessage: $('<div>'),
  $popupContent: $('<div>'),
  size_k: { text: { min: 111 } },
  comboInitialized: false,
  updatesPending: [],
  handleChromeAPIError: (error, operation) => {
    console.log(`Chrome API Error in ${operation}:`, error);
  },
  showSignOutOptions: () => {
    console.log('Show sign out options');
  },
  lastError: '',
  reset: () => {
    console.log('Reset called');
  },
  updateBoards: () => {
    console.log('Update boards called');
  },
  toggleActiveMouseDown: elm => {
    console.log('Toggle active mouse down');
  },
  showMessage: (parent, text) => {
    console.log('Show message:', text);
  },
  menuCtrl: {
    reset: options => {
      console.log('Menu control reset');
    },
  },
};

// Mock app
const mockApp = {
  events: {
    fire: (event, data) => {
      console.log(`Event fired: ${event}`, data);
    },
    addListener: (event, handler) => {
      console.log(`Event listener added: ${event}`);
    },
  },
  utils: {
    makeAvatarUrl: params => {
      return params.avatarUrl || '';
    },
  },
};

// Execute the PopupForm code
eval(popupFormCode);

// Test suite
function runTests() {
  console.log('Running PopupForm tests...\n');

  // Test 1: Constructor and initialization
  console.log('Test 1: Constructor and initialization');
  const form = new G2T.PopupForm({
    parent: mockParent,
    app: mockApp,
  });

  console.log('✓ Form created successfully');
  console.log('✓ Form ID:', form.ck.id);

  form.init();
  console.log('✓ Form initialized:', form.isInitialized);
  console.log('');

  // Test 2: Data binding
  console.log('Test 2: Data binding');
  const testData = {
    boardId: 'board1',
    listId: 'list1',
    cardName: 'New Card Name',
    cardDesc: 'New Description',
  };

  form.bindData(testData);
  console.log('✓ Data bound successfully');
  console.log('✓ Parent state updated:', mockParent.state.boardId === 'board1');
  console.log('');

  // Test 3: Validation
  console.log('Test 3: Validation');
  const validData = {
    boardId: 'board1',
    listId: 'list1',
    cardName: 'Valid Card',
  };

  mockParent.state = validData;
  const validErrors = form.validateData();
  console.log('✓ Valid data validation:', validErrors.length === 0);

  const invalidData = {
    boardId: '',
    listId: '',
    cardName: '',
  };

  mockParent.state = invalidData;
  const invalidErrors = form.validateData();
  console.log('✓ Invalid data validation:', invalidErrors.length > 0);
  console.log('✓ Error messages:', invalidErrors);
  console.log('');

  // Test 4: UI updates
  console.log('Test 4: UI updates');
  form.updateBoards();
  console.log('✓ Boards updated');

  form.updateLists();
  console.log('✓ Lists updated');
  console.log('');

  // Test 5: Form submission
  console.log('Test 5: Form submission');
  mockParent.state = validData;
  const submitResult = form.submit();
  console.log('✓ Form submission result:', submitResult);
  console.log('');

  console.log('All tests completed successfully!');
}

// Run tests
try {
  runTests();
} catch (error) {
  console.error('Test failed:', error);
  process.exit(1);
}
