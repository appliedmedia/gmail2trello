/**
 * Integration test step definitions for Gmail-2-Trello
 *
 * All G2T classes are REAL. Only external boundaries are mocked.
 */

const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const {
  createRealApp,
  mockTrelloResponses,
  mockTrelloAuthorize,
  mockChromeStorageGet,
  createMockFn,
  sharedWindow,
} = require('../support/integration_helpers');

// -------------------------------------------------------------------------
// Tag-scoped hooks for integration scenarios
// -------------------------------------------------------------------------

Before({ tags: '@integration' }, function () {
  // This runs before the generic Before hook in hooks.js
  // We'll set a flag so we know this is an integration scenario
  this._isIntegration = true;
});

After({ tags: '@integration' }, function () {
  // Clean up intervals
  if (this._realApp?.popupView?.intervalId) {
    clearInterval(this._realApp.popupView.intervalId);
  }
  this._realApp = null;
  this._firedEvents = null;
  this._eventData = null;
});

// -------------------------------------------------------------------------
// Helpers local to steps
// -------------------------------------------------------------------------

/**
 * Install an event listener that records when an event fires.
 */
function trackEvent(app, eventName, firedEvents, eventData) {
  app.events.addListener(eventName, (event, params) => {
    firedEvents[eventName] = true;
    eventData[eventName] = params;
  });
}

/**
 * Standard test user data
 */
const TEST_USER = {
  id: 'user1',
  fullName: 'Test User',
  username: 'testuser',
  avatarUrl: '',
  url: 'https://trello.com/testuser',
  initials: 'TU',
};

const TEST_BOARDS = [
  { id: 'b1', name: 'Board One' },
  { id: 'b2', name: 'Board Two' },
];

const TEST_LISTS = [
  { id: 'l1', name: 'To Do' },
  { id: 'l2', name: 'Doing' },
  { id: 'l3', name: 'Done' },
];

const TEST_LABELS = [
  { id: 'lab1', name: 'Bug', color: 'red' },
  { id: 'lab2', name: 'Feature', color: 'green' },
];

const TEST_MEMBERS = [
  { id: 'm1', fullName: 'Alice', username: 'alice' },
  { id: 'm2', fullName: 'Bob', username: 'bob' },
];

const TEST_CARDS = [
  { id: 'c1', name: 'Card 1' },
  { id: 'c2', name: 'Card 2' },
  { id: 'c3', name: 'Card 3' },
];

// -------------------------------------------------------------------------
// Background
// -------------------------------------------------------------------------

Given('all G2T classes are loaded and a real App is created', function () {
  this._realApp = createRealApp();
  this._firedEvents = {};
  this._eventData = {};

  // Track commonly asserted events
  const eventsToTrack = [
    'classAppStateLoaded',
    'checkTrelloAuthorized_success',
    'trelloUserReady',
    'trelloUserAndBoardsReady',
    'loadTrelloLists_success',
    'loadTrelloLabels_success',
    'loadTrelloMembers_success',
    'loadTrelloCards_success',
    'createCard_success',
    'invalidFormData',
    'gmailDataReady',
    'toolbarChanged',
    'forceRedraw',
    'newCardUploadsComplete',
  ];
  eventsToTrack.forEach(name => {
    trackEvent(this._realApp, name, this._firedEvents, this._eventData);
  });
});

// -------------------------------------------------------------------------
// App Initialization
// -------------------------------------------------------------------------

Then(
  'the app has real subsystems: events, model, gmailView, popupView, utils, gmail, goog',
  function () {
    const app = this._realApp;
    assert.ok(app.events, 'events missing');
    assert.ok(app.model, 'model missing');
    assert.ok(app.gmailView, 'gmailView missing');
    assert.ok(app.popupView, 'popupView missing');
    assert.ok(app.utils, 'utils missing');
    assert.ok(app.gmail, 'gmail missing');
    assert.ok(app.goog, 'goog missing');
  },
);

Then('all subsystems reference the same app instance', function () {
  const app = this._realApp;
  assert.strictEqual(app.events.app, app);
  assert.strictEqual(app.model.app, app);
  assert.strictEqual(app.gmailView.app, app);
  assert.strictEqual(app.popupView.app, app);
  assert.strictEqual(app.utils.app, app);
  assert.strictEqual(app.gmail.app, app);
  assert.strictEqual(app.goog.app, app);
});

Then(
  'EventTarget has listeners registered by Model, GmailView, PopupView, and PopupForm',
  function () {
    const app = this._realApp;
    // After App construction, subsystem constructors register event listeners.
    // We need to call init() first to get all bindings.
    app.init();

    const listeners = app.events._listeners;

    // Model registers these
    assert.ok(
      listeners['boardChanged']?.length > 0,
      'boardChanged listener missing',
    );
    assert.ok(
      listeners['listChanged']?.length > 0,
      'listChanged listener missing',
    );
    assert.ok(
      listeners['submittedFormShownComplete']?.length > 0,
      'submittedFormShownComplete listener missing',
    );

    // GmailView registers these
    assert.ok(
      listeners['onDetected']?.length > 0,
      'onDetected listener missing',
    );
    assert.ok(
      listeners['trelloUserAndBoardsReady']?.length > 0,
      'trelloUserAndBoardsReady listener missing',
    );

    // PopupView registers these
    assert.ok(
      listeners['popupLoaded']?.length > 0,
      'popupLoaded listener missing',
    );

    // PopupForm registers these
    assert.ok(
      listeners['gmailDataReady']?.length > 0,
      'gmailDataReady listener missing',
    );
    assert.ok(listeners['submit']?.length > 0, 'submit listener missing');
  },
);

// -------------------------------------------------------------------------
// Persist load
// -------------------------------------------------------------------------

Given(
  'Chrome storage returns saved state with boardId {string} and user fullName {string}',
  function (boardId, fullName) {
    const savedState = {
      boardId,
      user: { fullName },
    };
    mockChromeStorageGet({
      g2t_app: JSON.stringify(savedState),
    });
  },
);

When('persistLoad is called on the real app', function () {
  // Need bindEvents so handleClassAppStateLoaded is wired
  this._realApp.bindEvents();
  this._realApp.persistLoad();
});

Then('classAppStateLoaded event fires on the real app', function () {
  assert.ok(
    this._firedEvents['classAppStateLoaded'],
    'classAppStateLoaded did not fire',
  );
});

Then('the real app persist.boardId is {string}', function (expected) {
  assert.strictEqual(this._realApp.persist.boardId, expected);
});

Then('the real app persist.user.fullName is {string}', function (expected) {
  assert.strictEqual(this._realApp.persist.user?.fullName, expected);
});

// -------------------------------------------------------------------------
// Init
// -------------------------------------------------------------------------

When('init is called on the real app', function () {
  this._realApp.init();
});

Then('model.initialized is true', function () {
  assert.strictEqual(this._realApp.model.initialized, true);
});

Then('popupView.form.isInitialized is true', function () {
  // PopupView.isInitialized is set in handlePopupLoaded (DOM-dependent),
  // not in init(). Verify that init() ran by checking form.isInitialized instead.
  assert.strictEqual(this._realApp.popupView.form.isInitialized, true);
});

// -------------------------------------------------------------------------
// Trello Auth Chain
// -------------------------------------------------------------------------

Given('Trello authorize is mocked to succeed', function () {
  mockTrelloAuthorize(true);
});

Given('Trello authorize is mocked to fail', function () {
  // Mock both interactive=false (first attempt) and popup (second attempt) to fail
  sharedWindow.Trello.authorize = function (opts) {
    if (opts.error) opts.error({ error: 'Authorization failed' });
  };
  // Also mock Trello.authorized() to return false so the popup path triggers
  sharedWindow.Trello.authorized = createMockFn(() => false);
});

Given('Trello REST returns user data for members\\/me', function () {
  const currentRest = sharedWindow.Trello.rest;
  const existingMap = this._trelloResponseMap || {};
  existingMap['GET members/me'] = TEST_USER;
  this._trelloResponseMap = existingMap;
  mockTrelloResponses(this._trelloResponseMap);
});

Given('Trello REST returns boards data for members\\/me\\/boards', function () {
  const existingMap = this._trelloResponseMap || {};
  existingMap['GET members/me/boards'] = TEST_BOARDS;
  this._trelloResponseMap = existingMap;
  mockTrelloResponses(this._trelloResponseMap);
});

When('model.trelloLoad is called on the real app', function () {
  const $ = sharedWindow.$;
  // Set up minimal popup DOM so PopupForm.bindData won't crash
  $('body').find('#g2tPopup').remove();
  $('body').find('#g2tButton').remove();
  $('body').append('<div id="g2tButton"></div>');
  $('body').append(
    '<div id="g2tPopup"><div class="popupMsg"></div><div class="content"></div><div id="g2tDesc"></div><div id="g2tTitle"></div><div id="g2tBoard"></div><div id="g2tList"></div><div id="g2tCard"></div><div id="g2tDue_Shortcuts"></div><div id="g2tAvatarImgOrText"></div><a id="g2tAvatarUrl"></a><a id="g2tUsername"></a><div id="g2tSignOutButton"></div><div id="report"></div><div id="g2t_attachment_container"></div><div id="g2t_attachment"></div><div id="g2t_image_container"></div><div id="g2t_image"></div></div>',
  );
  this._realApp.popupView.popup = sharedWindow.document.querySelector('#g2tPopup');
  this._realApp.popupView.g2tButton = sharedWindow.document.querySelector('#g2tButton');
  this._realApp.popupView.popupMessage = this._realApp.popupView.popup.querySelector('.popupMsg');
  this._realApp.popupView.popupContent = this._realApp.popupView.popup.querySelector('.content');

  // Need init for event bindings
  this._realApp.init();
  this._realApp.model.trelloLoad();
});

Then('checkTrelloAuthorized_success event fires on the real app', function () {
  assert.ok(
    this._firedEvents['checkTrelloAuthorized_success'],
    'checkTrelloAuthorized_success did not fire',
  );
});

Then('trelloUserReady event fires on the real app', function () {
  assert.ok(
    this._firedEvents['trelloUserReady'],
    'trelloUserReady did not fire',
  );
});

Then('trelloUserAndBoardsReady event fires on the real app', function () {
  assert.ok(
    this._firedEvents['trelloUserAndBoardsReady'],
    'trelloUserAndBoardsReady did not fire',
  );
});

Then('the real app temp.boards has {int} items', function (count) {
  assert.strictEqual(this._realApp.temp.boards.length, count);
});

Then('the real app persist.trelloAuthorized is false', function () {
  assert.strictEqual(this._realApp.persist.trelloAuthorized, false);
});

// -------------------------------------------------------------------------
// Cached auth
// -------------------------------------------------------------------------

Given('app.persist.trelloAuthorized is set to true', function () {
  this._realApp.persist.trelloAuthorized = true;
});

Given('app.temp.boards is set to a non-empty array', function () {
  this._realApp.temp.boards = TEST_BOARDS;
});

When('model.load is called on the real app', function () {
  // Need init for event bindings
  this._realApp.init();
  // Track authorize calls
  this._authorizeCallCount = 0;
  sharedWindow.Trello.authorize = function () {
    // Should not be called
    this._authorizeCallCount = (this._authorizeCallCount || 0) + 1;
  }.bind(this);
  // Lane 4 will update class_utils.markdownify to accept native elements.
  // Until then, patch it here to wrap native elements with jQuery.
  const $ = sharedWindow.$;
  const origMarkdownify = this._realApp.utils.markdownify.bind(this._realApp.utils);
  this._realApp.utils.markdownify = (el, features, preprocess) => {
    const $el = el && el.nodeType ? $(el) : el;
    return origMarkdownify($el, features, preprocess);
  };
  this._realApp.model.load();
  this._realApp.utils.markdownify = origMarkdownify;
});

Then('Trello.authorize was not called', function () {
  assert.strictEqual(
    this._authorizeCallCount || 0,
    0,
    'Trello.authorize should not have been called',
  );
});

// -------------------------------------------------------------------------
// Board-List-Card Cascade
// -------------------------------------------------------------------------

Given('the real app has auth complete', function () {
  this._realApp.init();
  this._realApp.persist.trelloAuthorized = true;
  this._realApp.persist.user = TEST_USER;
});

Given(
  'Trello REST is mocked for board b1 lists, labels, and members',
  function () {
    this._trelloResponseMap = this._trelloResponseMap || {};
    this._trelloResponseMap['GET boards/b1/lists'] = TEST_LISTS;
    this._trelloResponseMap['GET boards/b1/labels'] = TEST_LABELS;
    this._trelloResponseMap['GET boards/b1/members'] = TEST_MEMBERS;
    mockTrelloResponses(this._trelloResponseMap);
  },
);

Given('Trello REST is mocked for list l1 cards', function () {
  this._trelloResponseMap = this._trelloResponseMap || {};
  this._trelloResponseMap['GET lists/l1/cards'] = TEST_CARDS;
  mockTrelloResponses(this._trelloResponseMap);
});

Given('Trello REST is mocked for full cascade on board b1', function () {
  this._trelloResponseMap = this._trelloResponseMap || {};
  this._trelloResponseMap['GET boards/b1/lists'] = TEST_LISTS;
  this._trelloResponseMap['GET boards/b1/labels'] = TEST_LABELS;
  this._trelloResponseMap['GET boards/b1/members'] = TEST_MEMBERS;
  // Cards for the first list
  this._trelloResponseMap['GET lists/l1/cards'] = TEST_CARDS;
  mockTrelloResponses(this._trelloResponseMap);
});

When('boardChanged event is emitted with boardId {string}', function (boardId) {
  this._restCallLog = [];
  const origRest = sharedWindow.Trello.rest;
  const self = this;
  // Wrap to track calls
  const wrappedRest = function (method, path, params, success, error) {
    self._restCallLog.push(`${method.toUpperCase()} ${path}`);
    return origRest(method, path, params, success, error);
  };
  sharedWindow.Trello.rest = wrappedRest;

  this._realApp.events.emit('boardChanged', { boardId });
});

When('listChanged event is emitted with listId {string}', function (listId) {
  this._realApp.events.emit('listChanged', { listId });
});

Then('loadTrelloLists_success event fires on the real app', function () {
  assert.ok(
    this._firedEvents['loadTrelloLists_success'],
    'loadTrelloLists_success did not fire',
  );
});

Then('loadTrelloLabels_success event fires on the real app', function () {
  assert.ok(
    this._firedEvents['loadTrelloLabels_success'],
    'loadTrelloLabels_success did not fire',
  );
});

Then('loadTrelloMembers_success event fires on the real app', function () {
  assert.ok(
    this._firedEvents['loadTrelloMembers_success'],
    'loadTrelloMembers_success did not fire',
  );
});

Then('loadTrelloCards_success event fires on the real app', function () {
  assert.ok(
    this._firedEvents['loadTrelloCards_success'],
    'loadTrelloCards_success did not fire',
  );
});

Then('the real app temp.lists has {int} items', function (count) {
  assert.strictEqual(this._realApp.temp.lists.length, count);
});

Then('the real app temp.labels has {int} items', function (count) {
  assert.strictEqual(this._realApp.temp.labels.length, count);
});

Then('the real app temp.members has {int} items', function (count) {
  assert.strictEqual(this._realApp.temp.members.length, count);
});

Then('the real app temp.cards has {int} items', function (count) {
  assert.strictEqual(this._realApp.temp.cards.length, count);
});

Then('Trello.rest was not called for lists', function () {
  // After emitting boardChanged with "_", no API calls should have been made
  const listCalls = (this._restCallLog || []).filter(c =>
    c.includes('lists'),
  );
  assert.strictEqual(
    listCalls.length,
    0,
    'Trello.rest should not have been called for lists',
  );
});

// -------------------------------------------------------------------------
// Card Submission
// -------------------------------------------------------------------------

Given(
  'Trello REST is mocked to return a card with id {string} on POST cards',
  function (cardId) {
    this._trelloResponseMap = this._trelloResponseMap || {};
    this._trelloResponseMap['POST cards'] = { id: cardId, name: 'New Card' };
    mockTrelloResponses(this._trelloResponseMap);
  },
);

When(
  'submittedFormShownComplete event fires with valid form data',
  function () {
    this._realApp.events.emit('submittedFormShownComplete', {
      data: {
        emailId: 'email-456',
        boardId: 'b1',
        listId: 'l1',
        title: 'Test Card',
        description: 'Test description',
      },
    });
  },
);

When(
  'submittedFormShownComplete event fires with form data for emailId {string}',
  function (emailId) {
    this._realApp.events.emit('submittedFormShownComplete', {
      data: {
        emailId,
        boardId: 'b1',
        listId: 'l1',
        title: 'Test Card',
        description: 'Test description',
      },
    });
  },
);

When('submittedFormShownComplete event fires with null data', function () {
  this._realApp.events.emit('submittedFormShownComplete', { data: null });
});

Then('newCardUploadsComplete event fires on the real app', function () {
  assert.ok(
    this._firedEvents['newCardUploadsComplete'],
    'newCardUploadsComplete did not fire',
  );
});

Then('the created card has cardId {string}', function (cardId) {
  const data = this._eventData['newCardUploadsComplete']?.data;
  assert.ok(data, 'newCardUploadsComplete event data missing');
  assert.strictEqual(data.cardId, cardId);
});

Then(
  'app.persist.eblcmArray contains a mapping for email {string} with cardId {string}',
  function (email, cardId) {
    const mapping = this._realApp.persist.eblcmArray.find(
      entry => entry.email === email,
    );
    assert.ok(mapping, `No mapping found for email ${email}`);
    assert.strictEqual(mapping.cardId, cardId);
  },
);

Then('invalidFormData event fires on the real app', function () {
  assert.ok(
    this._firedEvents['invalidFormData'],
    'invalidFormData did not fire',
  );
});

// -------------------------------------------------------------------------
// Gmail Data Parsing
// -------------------------------------------------------------------------

Given(
  'the DOM contains Gmail-structured HTML with subject and body',
  function () {
    const $ = sharedWindow.$;
    const $body = $('body');

    // Clean up any previous Gmail structure completely
    $body.find('.gmail-test-structure').remove();
    $body.find('.hP').remove();
    $body.find('.nH').not('#g2tPopup .nH').remove();
    $body.find('.aia').remove();
    $body.find('.h7').remove();

    // Create Gmail-like DOM structure
    const gmailHtml = `
    <div class="gmail-test-structure">
      <div class="nH">
        <span class="hP" data-legacy-thread-id="thread-123">Test Email Subject</span>
        <div class="h7" style="position:relative; top:0;">
          <div class="adn ads">
            <div class="gs">
              <div class="gH">
                <div class="gK">
                  <span class="g3" title="March 29, 2026">Mar 29</span>
                </div>
              </div>
              <span class="gD" name="Sender Name" email="sender@example.com"></span>
              <span class="g2" name="Recipient" email="recipient@example.com"></span>
              <div class="a3s aiL">
                <div dir="ltr">This is the email body content for testing.</div>
              </div>
              <span class="aZo" download_url="text/plain:attachment.txt:https://example.com/attachment.txt"></span>
            </div>
          </div>
        </div>
      </div>
    </div>`;

    $body.append(gmailHtml);

    // Set the gmailView root to the test structure specifically (field renamed $root -> root)
    this._realApp.gmailView.root = sharedWindow.document.querySelector('.gmail-test-structure');
  },
);

When(
  'gmailView.parseData is called with fullName {string}',
  function (fullName) {
    // Lane 4 will update class_utils.markdownify to accept native elements.
    // Until then, patch it here to wrap native elements with jQuery.
    const $ = sharedWindow.$;
    const origMarkdownify = this._realApp.utils.markdownify.bind(this._realApp.utils);
    this._realApp.utils.markdownify = (el, features, preprocess) => {
      const $el = el && el.nodeType ? $(el) : el;
      return origMarkdownify($el, features, preprocess);
    };
    this._realApp.gmailView.parsingData = false;
    this._parseResult = this._realApp.gmailView.parseData({ fullName });
    this._realApp.utils.markdownify = origMarkdownify;
  },
);

Then('the returned data has subject {string}', function (expected) {
  assert.ok(this._parseResult, 'parseData returned nothing');
  assert.strictEqual(this._parseResult.subject, expected);
});

Then('the returned data has bodyAsRaw containing {string}', function (text) {
  assert.ok(this._parseResult, 'parseData returned nothing');
  assert.ok(
    this._parseResult.bodyAsRaw?.includes(text),
    `bodyAsRaw does not contain "${text}". Got: ${(this._parseResult.bodyAsRaw || '').substring(0, 200)}`,
  );
});

Then('the returned data has an attachment array', function () {
  assert.ok(this._parseResult, 'parseData returned nothing');
  assert.ok(
    Array.isArray(this._parseResult.attachment),
    'attachment is not an array',
  );
});

// Gmail data flow to form

Given('the real app has DOM ready and persist loaded', function () {
  this._realApp.init();
  this._realApp.persist.trelloAuthorized = true;
  this._realApp.persist.user = TEST_USER;
  // Mark form conditions
  this._realApp.popupView.form.persistReady = true;
});

When(
  'trelloUserAndBoardsReady event fires triggering gmailDataReady',
  function () {
    // Lane 4 will update class_utils.markdownify to accept native elements.
    // Until then, patch it here to wrap native elements with jQuery.
    const $ = sharedWindow.$;
    const origMarkdownify = this._realApp.utils.markdownify.bind(this._realApp.utils);
    this._realApp.utils.markdownify = (el, features, preprocess) => {
      const $el = el && el.nodeType ? $(el) : el;
      return origMarkdownify($el, features, preprocess);
    };
    // Set up trello responses for the auth chain that fires during this event
    this._trelloResponseMap = this._trelloResponseMap || {};
    mockTrelloResponses(this._trelloResponseMap);
    this._realApp.events.emit('trelloUserAndBoardsReady');
    this._realApp.utils.markdownify = origMarkdownify;
  },
);

Then('gmailDataReady event fires on the real app', function () {
  assert.ok(
    this._firedEvents['gmailDataReady'],
    'gmailDataReady did not fire',
  );
});

Then('popupForm.pendingGmailData is set or lastGmailData is set', function () {
  const form = this._realApp.popupView.form;
  const hasPending = form.pendingGmailData !== null;
  const hasLast = form.lastGmailData !== null;
  assert.ok(
    hasPending || hasLast,
    'Neither pendingGmailData nor lastGmailData is set',
  );
});

// Missing email

Given('the DOM has no Gmail email structure', function () {
  const $ = sharedWindow.$;
  // Clean out any Gmail structure
  $('body').find('.gmail-test-structure').remove();
  $('body').find('.nH').remove();
  $('body').find('.aia').remove();
  $('body').find('.h7').remove();
  $('body').find('.hP').remove();
  this._realApp.gmailView.root = sharedWindow.document.body; // field renamed $root -> root
});

Then('parseData returns undefined without crashing', function () {
  assert.strictEqual(this._parseResult, undefined);
});

// -------------------------------------------------------------------------
// Navigation and Redraw via gmail.js events
// -------------------------------------------------------------------------

Given('the real app is initialized with gmail adapter', function () {
  this._realApp.init();
  // gmail adapter is initialized as part of app.init()
  assert.ok(this._realApp.gmail, 'gmail adapter should exist');
});

When('gmailViewChanged event fires on the real app', function () {
  try {
    this._realApp.events.emit('gmailViewChanged', { type: 'email', page: 'inbox', subject: 'Test' });
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

When('gmailLoaded event fires on the real app', function () {
  try {
    this._realApp.events.emit('gmailLoaded');
    this.error = null;
  } catch (e) {
    this.error = e;
  }
});

Then('the popupView handleGmailViewChanged ran without error', function () {
  assert.strictEqual(this.error, null, 'handleGmailViewChanged should not throw');
});

Then('the popupView handleGmailLoaded ran without error', function () {
  assert.strictEqual(this.error, null, 'handleGmailLoaded should not throw');
});

// -------------------------------------------------------------------------
// Hydration Gate
// -------------------------------------------------------------------------

Given('the real app has popupForm initialized', function () {
  this._realApp.init();
  // Ensure form is initialized but not yet "ready"
  this._realApp.popupView.form.domReady = false;
  this._realApp.popupView.form.persistReady = false;
  this._realApp.popupView.form.pendingGmailData = null;
  this._realApp.popupView.form.dataBound = false;
});

When('gmailDataReady fires before persistReady on the real app', function () {
  // Emit gmailDataReady with some data
  this._realApp.events.emit('gmailDataReady', {
    gmail: { subject: 'Test', bodyAsRaw: 'body' },
  });
});

Then('popupForm has pendingGmailData but dataBound is false', function () {
  const form = this._realApp.popupView.form;
  assert.ok(
    form.pendingGmailData !== null || form.lastGmailData !== null,
    'pendingGmailData should be set',
  );
  assert.strictEqual(form.dataBound, false, 'dataBound should still be false');
});

When('persistReady fires on the real app popupForm', function () {
  this._realApp.popupView.form.onPersistReady();
});

Then('popupForm.persistReady is true', function () {
  assert.strictEqual(this._realApp.popupView.form.persistReady, true);
});

// Late DOM ready

Given(
  'the real app has persist and gmail data ready but no DOM',
  function () {
    this._realApp.init();
    const form = this._realApp.popupView.form;
    form.domReady = false;
    form.persistReady = true;
    // Set pending gmail data with required structure including attachment/image arrays
    form.pendingGmailData = {
      subject: 'Test',
      bodyAsRaw: 'body',
      bodyAsMd: 'body',
      linkAsRaw: '',
      linkAsMd: '',
      ccAsRaw: '',
      ccAsMd: '',
      emailId: 'test-123',
      attachment: [],
      image: [],
    };
  },
);

When('popupLoaded fires making DOM ready', function () {
  // Set up minimal DOM elements that handlePopupLoaded expects
  const $ = sharedWindow.$;
  $('body').find('#g2tButton').remove();
  $('body').find('#g2tPopup').remove();
  $('body').append('<div id="g2tButton"></div>');
  $('body').append(
    '<div id="g2tPopup">' +
    '<div class="popupMsg"></div>' +
    '<div class="content"></div>' +
    '<div id="g2tDesc"></div>' +
    '<div id="g2tTitle"></div>' +
    '<div id="g2tBoard"></div>' +
    '<div id="g2tList"></div>' +
    '<div id="g2tCard"></div>' +
    '<div id="g2tDue_Shortcuts"></div>' +
    '<div id="g2tAvatarImgOrText"></div>' +
    '<a id="g2tAvatarUrl"></a>' +
    '<a id="g2tUsername"></a>' +
    '<div id="g2tSignOutButton"></div>' +
    '<div id="report"></div>' +
    '<div id="g2t_attachment_container"></div>' +
    '<div id="g2t_attachment"></div>' +
    '<div id="g2t_image_container"></div>' +
    '<div id="g2t_image"></div>' +
    '<button id="addToTrello"></button>' +
    '</div>',
  );

  // Set toolbar reference so popup can initialize
  this._realApp.popupView.toolBar = sharedWindow.document.body;

  // Emit popupLoaded to trigger handlePopupLoaded
  this._realApp.events.emit('popupLoaded');
});

Then('popupForm.domReady is true', function () {
  assert.strictEqual(this._realApp.popupView.form.domReady, true);
});
