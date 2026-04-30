var G2T = G2T || {}; // must be var to guarantee correct scope - do not alter this line

class PopupView {
  static get ck() {
    // class keys here to assure they're treated like consts
    const ck = {
      id: 'g2t_popupview',
    };
    return ck;
  }

  get ck() {
    return PopupView.ck;
  }

  // Backward-compat shims for cross-class callers still using $popup etc.
  // These will be deleted in Lane 6. Setters unwrap jQuery objects so that
  // test setup code (and GmailView lane-3) can still write $foo = $(...) and
  // have the native field updated correctly.
  get $popup() {
    return this.popup ? $(this.popup) : null;
  }
  set $popup(jqVal) {
    this.popup = jqVal && jqVal[0] ? jqVal[0] : null;
  }
  get $popupContent() {
    return this.popupContent ? $(this.popupContent) : null;
  }
  set $popupContent(jqVal) {
    this.popupContent = jqVal && jqVal[0] ? jqVal[0] : null;
  }
  get $popupMessage() {
    return this.popupMessage ? $(this.popupMessage) : null;
  }
  set $popupMessage(jqVal) {
    this.popupMessage = jqVal && jqVal[0] ? jqVal[0] : null;
  }
  get $g2tButton() {
    return this.g2tButton ? $(this.g2tButton) : null;
  }
  set $g2tButton(jqVal) {
    this.g2tButton = jqVal && jqVal[0] ? jqVal[0] : null;
  }
  get $toolBar() {
    return this.toolBar ? $(this.toolBar) : null;
  }
  // Accepts either a native Element (Lane 3 GmailView) or a jQuery
  // wrapper (legacy callers). Unwrap to native so this.toolBar is always
  // a plain Element.
  set $toolBar(val) {
    if (!val) {
      this.toolBar = null;
    } else if (val.nodeType === 1) {
      this.toolBar = val;
    } else if (val[0]) {
      this.toolBar = val[0];
    } else {
      this.toolBar = null;
    }
  }

  constructor(args) {
    this.app = args.app;
    this.isInitialized = false;

    // Remove local state - use centralized app state

    this.size_k = {
      width: {
        min: 700,
        max: window.innerWidth - 16, // Max width is 100% of the window - 1em. KS
      },
      height: {
        min: 464,
        max: 1400,
      },
      text: {
        min: 111,
      },
    };
    this.draggable = {
      height: {
        min: 464,
        max: window.innerHeight - 100, // 100 - a safety buffer to prevent the dragable controls from being hidden by gmail's menu buttons.
      },
      width: {
        min: 700,
        max: window.innerWidth - 100,
      },
    };

    // html pieces
    this.html = {};

    this.chrome_access_token = '';

    this.dataDirty = true;

    this.MAX_BODY_SIZE = 16384;

    this.mouseDownTracker = {};

    this.lastError = '';

    this.EVENT_LISTENER = '.g2t_event_listener'; // NOTE (acoven@2020-05-23): beginning with dot intentional and required

    this.CLEAR_EXT_BROWSING_DATA = 'g2t_clear_extension_browsing_data';

    this.VERSION_STORAGE = 'g2t_version';

    this.ATTRIBUTE_STORAGE = 'g2t-attr-';

    this.updatesPending = [];
    this.comboInitialized = false;

    // AbortControllers for document-level and element-level event listeners
    this.controllers = {};

    // Initialize form instance
    this.form = new G2T.PopupForm({
      parent: this,
      app: this.app,
    });
  }

  // Helper: abort + replace a named AbortController
  _resetController(name) {
    if (this.controllers[name]) {
      this.controllers[name].abort();
    }
    this.controllers[name] = new AbortController();
    return this.controllers[name];
  }

  // Helper: insert an HTML string into a parent element safely via DOMParser (Path A)
  _appendHtml(parent, htmlString) {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    const nodes = Array.from(doc.body.childNodes);
    nodes.forEach(node => parent.appendChild(node));
  }

  finalCreatePopup() {
    if (!this.toolBar) {
      return; // button not available yet
    }

    let needInit = false;
    const button = document.querySelector('#g2tButton');
    const popup = document.querySelector('#g2tPopup');

    if (!button) {
      if (
        this.html &&
        this.html['add_to_trello'] &&
        this.html['add_to_trello'].length > 0
      ) {
        this.app.utils.log(
          'PopupView:confirmPopup: add_to_trello_html already exists',
        );
      } else {
        let img = 'G2T';
        let classAdd = 'Bn';

        // Refresh icon present? If so, use graphics, if not, use text:
        if (
          this.toolBar.querySelectorAll(
            'div.asl.T-I-J3.J-J5-Ji,div.asf.T-I-J3.J-J5-Ji',
          ).length > 0
        ) {
          img =
            '<img class="f tk3N6e-I-J3" height="20" width="20" src="' +
            this.app.goog.runtimeGetURL('images/icon-48.png') +
            '" />';
          classAdd = 'asa ';
        }

        this.html['add_to_trello'] =
          '<div id="g2tButton" class="' +
          'G-Ni J-J5-Ji" ' + // "lS T-I-ax7 ar7" // 'G-Ni J-J5-Ji T-I ar7 nf T-I-ax7 L3" '
          'data-tooltip="Add this Gmail to Trello">' +
          '<div class="' +
          classAdd +
          '">' +
          '<div aria-haspopup="true" role="button" class="J-J5-Ji W6eDmd L3 J-J5-Ji L3" tabindex="0">' + // class="J-J5-Ji W6eDmd L3 J-J5-Ji Bq L3">' // Bq = Delete icon
          img +
          '<div id="g2tDownArrow" class="G-asx T-I-J3 J-J5-Ji">&nbsp;</div></div></div></div>';
      }
      this.app.utils.log('PopupView:confirmPopup: creating button');
      this._appendHtml(this.toolBar, this.html['add_to_trello']);
      needInit = true;
    } else if (button.offsetParent !== null) {
      this.app.utils.log('PopupView:confirmPopup: button visible');
    } else {
      this.app.utils.log(
        'PopupView:confirmPopup: Button is in an inactive region. Moving...',
      );
      //relocate
      const allButtons = document.querySelectorAll('#g2tButton');
      if (allButtons.length > 1) {
        allButtons.forEach(b => b.remove()); // In case multiple copies were created
        const allPopups = document.querySelectorAll('#g2tPopup');
        if (allPopups.length > 1) {
          allPopups.forEach(p => p.remove()); // In case copies were created
        }
      }
      this.app.utils.log('PopupView:confirmPopup: adding Button and Popup');
      const singleButton = document.querySelector('#g2tButton');
      const singlePopup = document.querySelector('#g2tPopup');
      if (singleButton) this.toolBar.appendChild(singleButton);
      if (singlePopup) this.toolBar.appendChild(singlePopup);
    }

    if (needInit || !popup) {
      if (this.html && this.html['popup'] && this.html['popup'].length > 0) {
        this.app.utils.log('PopupView:confirmPopup: adding popup');
        this._appendHtml(this.toolBar, this.html['popup']);
        // Emit popupLoaded event
        this.app.events.emit('popupLoaded');
        needInit = true;
      } else {
        needInit = false;
        function confirmPopup_loadFile(html) {
          this.html['popup'] = html;
          this.app.utils.log('PopupView:confirmPopup: creating popup');
          this._appendHtml(this.toolBar, html);
          this.app.events.emit('popupLoaded');
        }
        const path = 'views/popupView.html';
        const callback = confirmPopup_loadFile.bind(this);
        this.app.utils.loadFile({ path, callback });
      }
    }

    if (needInit) {
      // State is loaded centrally by app
    }
  }

  /**
   * Set the initial width by measuring from the left corner of the
   * "Add card" button to the edge of the window and then center that under the "Add card" button:
   */
  centerPopup(useWidth) {
    // Use native offsetLeft/offsetWidth/offsetParent in place of jQuery .position()/.width()/.offsetParent()
    const g2tLeft = this.g2tButton.offsetLeft;
    const g2tRight = g2tLeft + this.g2tButton.offsetWidth;
    let g2tCenter = g2tLeft + this.g2tButton.offsetWidth / 2;

    const parentEl = this.g2tButton.offsetParent || document.body;
    const parentRight = parentEl.offsetLeft + parentEl.offsetWidth;

    const length_from_left_k = g2tLeft * 1.5;
    const length_from_right_k = (parentRight - g2tRight) * 1.5;
    const calcWidth_k = Math.min(length_from_left_k, length_from_right_k); // If we need a width to use

    // We'll make our popup 1.25x as wide as the button to the end of the window up to max width:
    let newPopupWidth = this.size_k.width.min;
    if (useWidth && useWidth > 0) {
      newPopupWidth = useWidth; // May snap to min if necessary
      g2tCenter = this.popup.offsetLeft + this.popup.offsetWidth / 2;
    } else if (this.app.persist.popupWidth > 0) {
      newPopupWidth = this.app.persist.popupWidth;
    } else {
      newPopupWidth = calcWidth_k;
    }

    newPopupWidth = Math.min(
      this.size_k.width.max,
      Math.max(this.size_k.width.min, newPopupWidth),
    );

    let newPopupLeft = g2tCenter - newPopupWidth / 2;

    if (newPopupLeft < 0) {
      // button positions have moved, recalculate
      newPopupWidth = calcWidth_k;
      newPopupLeft = g2tCenter - newPopupWidth / 2;
    }

    this.popup.style.width = newPopupWidth + 'px';
    this.popup.style.left = newPopupLeft + 'px';

    // Store initial popup width
    this.app.persist.popupWidth = newPopupWidth;

    // this.onResize();

    // set posDirty to true here if we needed to re-center popup after resizing
  }

  resetDragResize() {
    this.$popup.draggable({
      disabled: false,
      containment: 'window',
      cancel: 'a, button, input, select, textarea, .ui-autocomplete, .hideMsg',
    });

    this.$popup.resizable({
      disabled: false,
      minHeight: this.draggable.height.min,
      minWidth: this.draggable.width.min,
      maxHeight: this.draggable.height.max,
      maxWidth: this.draggable.width.max,
      resize: () => {
        // This will remove the max-height restriction set in CSS, thereby allwing the user to resize freely.
        const popupEl = document.querySelector('#g2tPopup');
        if (getComputedStyle(popupEl).maxHeight !== 'inherit') {
          popupEl.style.maxHeight = 'inherit';
        }
        // Update stored popup width on resize
        this.app.persist.popupWidth = this.popup.offsetWidth;
      },
      handles: 'w,sw,s,se,e',
    });
  }

  bindEvents() {
    // Only bind the popupLoaded event here - everything else waits for DOM
    this.app.events.addListener(
      'popupLoaded',
      this.handlePopupLoaded.bind(this),
    );

    // Bind internal PopupView events
    this.app.events.addListener(
      'onPopupVisible',
      this.handlePopupVisible.bind(this),
    );

    // Bind events moved from App (pure PopupView operations)
    this.app.events.addListener(
      'onBeforeAuthorize',
      this.handleBeforeAuthorize.bind(this),
    );

    this.app.events.addListener(
      'onBeforeLoadTrello',
      this.handleBeforeLoadTrello.bind(this),
    );
    // PopupForm now handles the final assembly when data is ready

    // Gmail.js event-driven button management (replaces setInterval polling)
    this.app.events.addListener(
      'gmailViewChanged',
      this.handleGmailViewChanged.bind(this),
    );
    this.app.events.addListener(
      'gmailLoaded',
      this.handleGmailLoaded.bind(this),
    );
  }

  bindPopupEvents() {
    // Bind chrome.runtime.onMessage for popup-specific messages
    this.app.goog.runtimeOnMessageAddListener(
      this.handleRuntimeMessage.bind(this),
    );
  }

  handlePersistLoaded() {
    if (this.form?.onPersistReady) {
      this.form.onPersistReady();
    }
  }

  showPopup() {
    if (this.g2tButton && this.popup) {
      // keydown handler
      const kdCtrl = this._resetController('keydown');
      document.addEventListener(
        'keydown',
        event => {
          const visible_k = this.popupVisible();
          const periodASCII_k = 46;
          const periodNumPad_k = 110;
          const periodKeyCode_k = 190;
          const isEscape_k = event.key === 'Escape';
          const isEnter_k = event.key === 'Enter';
          const isPeriodASCII_k = event.which === periodASCII_k;
          const isPeriodNumPad_k = event.which === periodNumPad_k;
          const isPeriodKeyCode_k = event.which === periodKeyCode_k;
          const isPeriod_k =
            isPeriodASCII_k || isPeriodNumPad_k || isPeriodKeyCode_k;
          const isCtrlCmd_k = event.ctrlKey || event.metaKey;
          const isCtrlCmdPeriod_k = isCtrlCmd_k && isPeriod_k;
          const isCtrlCmdEnter_k = isCtrlCmd_k && isEnter_k;

          if (visible_k) {
            if (isEscape_k || isCtrlCmdPeriod_k) {
              this.hidePopup();
            } else if (isCtrlCmdEnter_k) {
              this.form.submit();
            }
          }
        },
        { signal: kdCtrl.signal },
      );

      /* Temporarily disabled to test link clicks
      const muCtrl = this._resetController('mouseup');
      document.addEventListener('mouseup', event => {
        // Click isn't always propagated on Mailbox bar, so using mouseup instead.
        if (
          !event.target.closest('#g2tButton') &&
          !event.target.closest('#g2tPopup') &&
          g2t_has(this.mouseDownTracker, event.target) &&
          this.mouseDownTracker[event.target] === 1 &&
          !event.target.closest('.ui-autocomplete')
        ) {
          this.mouseDownTracker[event.target] = 0;
          // Add small delay to allow link clicks to process first
          setTimeout(() => {
            this.hidePopup();
          }, 10);
        }
        // Clear mouseDownTracker for any click
        if (g2t_has(this.mouseDownTracker, event.target)) {
          this.mouseDownTracker[event.target] = 0;
        }
      }, { signal: muCtrl.signal });
      */

      // mousedown handler
      const mdCtrl = this._resetController('mousedown');
      document.addEventListener(
        'mousedown',
        event => {
          // Click isn't always propagated on Mailbox bar, so using mouseup instead
          if (
            !event.target.closest('#g2tButton') &&
            !event.target.closest('#g2tPopup')
          ) {
            this.mouseDownTracker[event.target] = 1;
          }
        },
        { signal: mdCtrl.signal },
      );

      // focusin handler
      const fiCtrl = this._resetController('focusin');
      document.addEventListener(
        'focusin',
        event => {
          // Only hide popup if focus is outside both the button and popup
          // AND the target is not inside the popup (additional safety check)
          if (
            !event.target.closest('#g2tButton') &&
            !event.target.closest('#g2tPopup') &&
            !event.target.matches('#g2tPopup, #g2tPopup *')
          ) {
            this.hidePopup();
          }
        },
        { signal: fiCtrl.signal },
      );

      //  this.centerPopup(); // Did this here if posDirty was true

      // resetting the max height on load.
      document.querySelector('#g2tPopup').style.maxHeight = '564px';
      this.mouseDownTracker = {};

      this.popup.style.display = 'block';

      this.app.events.emit('onPopupVisible');
    }
  }

  toggleActiveMouseDown(elm) {
    const activeDiv = elm;
    if (!activeDiv.classList.contains('active-mouseDown')) {
      activeDiv.classList.add('active-mouseDown');
    } else {
      activeDiv.classList.remove('active-mouseDown');
    }
  }

  hidePopup() {
    if (this.g2tButton && this.popup) {
      // Abort all document-level controllers
      ['keydown', 'mouseup', 'mousedown', 'focusin'].forEach(name => {
        if (this.controllers[name]) {
          this.controllers[name].abort();
          this.controllers[name] = null;
        }
      });
      this.popup.style.display = 'none';
    }
  }

  popupVisible() {
    let visible = false;
    if (
      this.g2tButton &&
      this.popup &&
      getComputedStyle(this.popup).display === 'block'
    ) {
      visible = true;
    }

    return visible;
  }

  getManifestVersion() {
    try {
      return chrome?.runtime?.getManifest?.()?.version || '0';
    } catch (error) {
      this.handleChromeAPIError(error, 'getManifestVersion');
      return '0';
    }
  }

  handleChromeAPIError(error, operation) {
    this.app.utils.log(`${operation} ERROR: extension context invalidated`);
    this.displayExtensionInvalidReload();
  }

  forceSetVersion() {
    const version_storage_k = this.VERSION_STORAGE;
    const version_new = this.getManifestVersion();
    const dict_k = {
      [version_storage_k]: version_new,
    };
    this.app.goog.storageSyncSet(dict_k);
  }

  /**
   * Validate button state - check if button exists, is attached, and has event listeners
   * This catches cases where Gmail's DOM changes orphan our button
   */
  validateButtonState() {
    const button = document.querySelector('#g2tButton');

    // No button at all - handleDetectButton will create it
    if (!button) {
      return;
    }

    // Check 1: Is button attached to the document?
    if (!document.documentElement.contains(button)) {
      this.app.utils.log(
        'periodicChecks: Button exists but is detached from DOM. Removing orphan...',
      );
      button.remove();
      document.querySelector('#g2tPopup')?.remove();
      return;
    }

    // Check 2: Is button in the correct toolbar?
    const toolbar = document.querySelector("[gh='mtb']");
    if (toolbar) {
      const buttonInToolbar = toolbar.querySelector('#g2tButton');
      if (!buttonInToolbar) {
        this.app.utils.log(
          'periodicChecks: Button exists but not in active toolbar. Re-injecting...',
        );
        button.remove();
        document.querySelector('#g2tPopup')?.remove();
        this.handleDetectButton();
        return;
      }
    }

    // Check 3: Does button have event binding marker?
    // Use marker attribute instead of jQuery internals
    if (!button.hasAttribute('data-g2t-bound')) {
      this.app.utils.log(
        'periodicChecks: Button missing event binding marker. Re-binding...',
      );
      // Re-bind events by calling handlePopupLoaded
      if (this.isInitialized) {
        this.handlePopupLoaded();
      }
      return;
    }

    // Check 4: Is button visible?
    if (button.offsetParent === null) {
      this.app.utils.log(
        'periodicChecks: Button exists but not visible. May be in wrong location...',
      );
      // Don't remove - might be intentionally hidden, but log for debugging
    }
  }

  periodicChecks() {
    // Enhanced button validation - check if button exists and is functional
    this.validateButtonState();

    // Check for button detection (creates button if missing)
    this.handleDetectButton();

    // Check for version updates
    const version_storage_k = this.VERSION_STORAGE;
    const version_new = this.getManifestVersion();

    if (version_new > '0') {
      this.app.goog.storageSyncGet(version_storage_k, response => {
        const version_old = response?.[version_storage_k] || '0';
        if (version_old > '0') {
          if (version_old !== version_new) {
            function periodicChecks_loadFile(html) {
              this.form.showMessage(this, html);
            }
            const path = 'views/versionUpdate.html';
            const dict = { version_old, version_new };
            const callback = periodicChecks_loadFile.bind(this);
            this.app.utils.loadFile({ path, dict, callback });
          }
        } else {
          this.forceSetVersion();
        }
      });
    }
  }

  showSignOutOptions(data) {
    function showSignOutOptions_loadFile(html) {
      this.form.showMessage(this, html);
    }
    const path = 'views/signOut.html';
    const callback = showSignOutOptions_loadFile.bind(this);
    this.app.utils.loadFile({ path, callback }).catch(() => {
      this.app.utils.log('PopupView: failed to load signOut.html');
    });
  }

  // Select/de-select attachment and image based on first button's state:

  displayExtensionInvalidReload() {
    // can't get this from html doc via chrome call if context is invalidated
    const message = `<a class="hideMsg" title="Dismiss message">&times;</a><h3>Gmail-2-Trello has changed</h3>
    The page needs to be reloaded to work correctly.
    <button id="reload-button">Click here to reload this page</button>  <span id="reload-status" style="color: red">&nbsp;</span>`;

    this.form.showMessage(this, message);

    // Attach reload button handler after message is shown
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      const reloadBtn = document.querySelector('#reload-button');
      if (reloadBtn) {
        const reloadCtrl = this._resetController('reload');
        reloadBtn.addEventListener(
          'click',
          () => {
            // Use window.location.reload() which works even when extension context is invalidated
            window.location.reload();
          },
          { signal: reloadCtrl.signal },
        );
      }
    }, 100);
  }

  handlePopupVisible() {
    // Show loading message and start data loading
    this.form.showMessage(this.app, 'Loading...');

    // Let the model decide if it needs to load or if data is already ready
    this.app.model.load();
  }

  handleDetectButton() {
    if (this.app.gmailView.preDetect()) {
      this.toolBar = this.app.gmailView.$toolBar || null;
      this.finalCreatePopup();
    }
  }

  /**
   * Handle force redraw request from GmailView
   * Called when Gmail navigation causes toolbar replacement
   */
  handleForceRedraw() {
    this.app.utils.log('PopupView: Force redraw requested');

    // Clear cached HTML to force recreation
    if (this.html && this.html['add_to_trello']) {
      this.html['add_to_trello'] = '';
    }

    // Reset toolbar reference
    this.toolBar = null;

    // The actual redraw will happen via handleDetectButton in next periodic check
    // or immediately if detect is called
  }

  handleBeforeAuthorize() {
    this.form.bindData(); // No longer need to pass data parameter
    this.form.showMessage(this.app, 'Authorizing...');
  }

  handleBeforeLoadTrello() {
    this.form.showMessage(this.app, 'Loading Trello data...');
  }

  // PopupForm now handles final assembly when data is ready

  // Helper function for updating attachment/image arrays when checkboxes change
  updateAttachmentData(tag = '') {
    if (!tag) {
      return;
    }
    const containerTag = `g2t_${tag}`;
    const { array } = this.form.mime_array(containerTag);
    this.app.temp[tag] = array;
  }

  handleRuntimeMessage(request, sender, sendResponse) {
    if (request?.message === 'g2t_keyboard_shortcut') {
      this.showPopup();
    }
  }

  handlePopupLoaded() {
    // This is the DOM-dependent code that used to be at the end of init() (from init_popup)
    this.g2tButton = document.querySelector('#g2tButton');
    this.popup = document.querySelector('#g2tPopup');
    this.popupMessage = this.popup.querySelector('.popupMsg');
    this.popupContent = this.popup.querySelector('.content');
    this.centerPopup();
    this.isInitialized = true;

    // Show any pending message that was queued before DOM was ready
    if (this.pendingMessage) {
      this.form.showMessage(
        this.pendingMessage.parent,
        this.pendingMessage.text,
      );
      this.pendingMessage = null;
    }

    // Bind all events now that DOM is ready
    this.bindPopupEvents();

    // DOM event bindings moved from bindEvents()
    this.resetDragResize();

    if (this.form?.onDomReady) {
      this.form.onDomReady();
    }

    // close button
    const closeBtn = this.popup.querySelector('#close-button');
    if (closeBtn) {
      const closeBtnCtrl = this._resetController('closeBtn');
      closeBtn.addEventListener('click', () => this.hidePopup(), {
        signal: closeBtnCtrl.signal,
      });
    }

    // g2tButton: mousedown / mouseenter / mouseleave
    const btnMdCtrl = this._resetController('g2tButtonMousedown');
    this.g2tButton.addEventListener(
      'mousedown',
      event => {
        if (this.app.utils.modKey(event)) {
          // TODO (Ace, 28-Mar-2017): Figure out how to reset layout here!
        } else {
          if (this.popupVisible()) {
            this.hidePopup();
          } else {
            this.showPopup();
          }
        }
      },
      { signal: btnMdCtrl.signal },
    );

    const btnMeCtrl = this._resetController('g2tButtonMouseenter');
    this.g2tButton.addEventListener(
      'mouseenter',
      function (evt) {
        evt.currentTarget.classList.add('T-I-JW');
      },
      { signal: btnMeCtrl.signal },
    );

    const btnMlCtrl = this._resetController('g2tButtonMouseleave');
    this.g2tButton.addEventListener(
      'mouseleave',
      function (evt) {
        evt.currentTarget.classList.remove('T-I-JW');
      },
      { signal: btnMlCtrl.signal },
    );

    this.g2tButton.setAttribute('data-g2t-bound', '1'); // Mark as bound

    // board change
    const boardEl = this.popup.querySelector('#g2tBoard');
    if (boardEl) {
      const boardCtrl = this._resetController('boardChange');
      boardEl.addEventListener(
        'change',
        () => {
          const boardId = boardEl.value;
          const listEl = this.popup.querySelector('#g2tList');
          const cardEl = this.popup.querySelector('#g2tCard');
          const labelsEl = this.popup.querySelector('#g2t_label');
          const membersEl = this.popup.querySelector('#g2tMembers');
          if (boardId === '_') {
            boardEl.value = '';
          }
          if (
            boardId === '_' ||
            boardId === '' ||
            boardId !== this.app.persist.boardId
          ) {
            membersEl.replaceChildren();
            membersEl.style.display = 'none';
            labelsEl.replaceChildren();
            labelsEl.style.display = 'none';
            const listOpt = new Option('...please pick a board...', '');
            listEl.replaceChildren(listOpt);
            listEl.value = '';
            const cardOpt = new Option('...please pick a list...', '');
            cardEl.replaceChildren(cardOpt);
            cardEl.value = '';
            this.app.persist.labelsId = '';
            this.app.persist.listId = '';
            this.app.persist.cardId = '';
            this.app.persist.boardId = boardId;
            this.form.updateSubmitAvailable();
          } else {
            membersEl.style.display = 'none';
            labelsEl.style.display = 'none';
          }
          if (this.form.comboBox) this.form.comboBox('updateValue');
          this.app.events.emit('boardChanged', { boardId });
        },
        { signal: boardCtrl.signal },
      );
    }

    // list change
    const listEl = this.popup.querySelector('#g2tList');
    if (listEl) {
      const listCtrl = this._resetController('listChange');
      listEl.addEventListener(
        'change',
        () => {
          const listId = listEl.value;
          this.app.persist.listId = listId;
          this.form.updateSubmitAvailable();
          if (this.form.comboBox) this.form.comboBox('updateValue');
          this.app.events.emit('listChanged', { listId });
        },
        { signal: listCtrl.signal },
      );
    }

    // position select: change + keyup
    const positionEl = this.popup.querySelector('#g2tPosition');
    if (positionEl) {
      const posChangeCtrl = this._resetController('positionChange');
      positionEl.addEventListener(
        'change',
        event => {
          document
            .querySelector('#' + event.target.getAttribute('next-select'))
            ?.querySelector('input')
            ?.focus();
        },
        { signal: posChangeCtrl.signal },
      );
      const posKeyupCtrl = this._resetController('positionKeyup');
      positionEl.addEventListener(
        'keyup',
        event => {
          if (event.which == 13) {
            document
              .querySelector('#' + event.target.getAttribute('next-select'))
              ?.querySelector('input')
              ?.focus();
          }
        },
        { signal: posKeyupCtrl.signal },
      );
    }

    // card change
    const cardEl = this.popup.querySelector('#g2tCard');
    if (cardEl) {
      const cardCtrl = this._resetController('cardChange');
      cardEl.addEventListener(
        'change',
        () => {
          const selectedOption = cardEl.options[cardEl.selectedIndex];
          const cardId = selectedOption?.value || '';
          this.app.persist.cardId = cardId;

          // Set card-derived temp values directly
          this.app.temp.cardPos = selectedOption?.pos || '';
          this.app.temp.cardMembers = selectedOption?.members || '';
          this.app.temp.cardLabels = selectedOption?.labels || '';

          if (this.form.comboBox) this.form.comboBox('updateValue');
        },
        { signal: cardCtrl.signal },
      );
    }

    // due date shortcuts
    const dueShortsEl = this.popup.querySelector('#g2tDue_Shortcuts');
    if (dueShortsEl) {
      const dueShortCtrl = this._resetController('dueShortcuts');
      dueShortsEl.addEventListener(
        'change',
        event => {
          const dayOfWeek_k = {
            sun: 0,
            sunday: 0,
            mon: 1,
            monday: 1,
            tue: 2,
            tuesday: 2,
            wed: 3,
            wednesday: 3,
            thu: 4,
            thursday: 4,
            fri: 5,
            friday: 5,
            sat: 6,
            saturday: 6,
          };
          const pad0 = (str = '', n = 2) => {
            return ('0'.repeat(n) + str).slice(-n);
          };
          const dom_date_format = (d = new Date()) => {
            return `${d.getFullYear()}-${pad0(d.getMonth() + 1)}-${pad0(
              d.getDate(),
            )}`;
          };
          const dom_time_format = (d = new Date()) => {
            return `${pad0(d.getHours())}:${pad0(d.getMinutes())}`;
          };

          const due_k = (event.target.value || '').split(' ');
          let d = new Date();
          const [due_date, due_time] = due_k || [];
          let new_date = '';
          let new_time = '';

          if (due_date.substr(1, 1) === '+') {
            d.setDate(d.getDate() + Number.parseInt(due_date.substr(2), 10));
            new_date = dom_date_format(d);
          } else if (due_date.substr(1, 1) === '=') {
            d.setDate(d.getDate() + 1);
            const weekday_k = due_date.substr(2).toLowerCase();
            if (weekday_k === '0') {
              new_date = '';
            } else {
              const weekday_num_k = dayOfWeek_k[weekday_k];
              while (d.getDay() !== weekday_num_k) {
                d.setDate(d.getDate() + 1);
              }
              new_date = dom_date_format(d);
            }
          } else {
            this.app.utils.log(
              `due_Shortcuts:change: Unknown due date shortcut: "${due_date}"`,
            );
          }

          if (due_time.substr(2, 1) === '+') {
            d.setTime(d.getTime() + Number.parseInt(due_time.substr(3), 10));
            new_time = dom_time_format(d);
          } else if (due_time.substr(2, 1) === '=') {
            if (due_time.substr(3) === '0') {
              new_time = '';
            } else {
              const am_k = due_time.substr(0, 1).toLowerCase() === 'a';
              const hhmm_k = due_time.substr(3).split(':');
              let hours = Number.parseInt(hhmm_k[0], 10);
              if (hours === 12) {
                hours = 0;
              }
              if (!am_k) {
                hours += 12;
              }
              new_time =
                ('0' + hours.toString()).substr(-2) +
                ':' +
                ('0' + (hhmm_k[1] || 0).toString()).substr(-2);
            }
          } else {
            this.app.utils.log(
              `due_Shortcuts:change: Unknown due time shortcut: "${due_time}"`,
            );
          }

          const dueDateEl = this.popup.querySelector('#g2tDue_Date');
          const dueTimeEl = this.popup.querySelector('#g2tDue_Time');
          if (new_date.length > 0) {
            dueDateEl.value = new_date;
          }
          if (new_time.length > 0) {
            dueTimeEl.value = new_time;
          }
        },
        { signal: dueShortCtrl.signal },
      );
    }

    // submit button
    const submitEl = this.popup.querySelector('#g2tSubmit');
    if (submitEl) {
      const submitCtrl = this._resetController('submit');
      submitEl.addEventListener('click', () => this.form.submit(), {
        signal: submitCtrl.signal,
      });
    }

    // sign out
    const signOutEl = this.popup.querySelector('#g2tSignOut');
    if (signOutEl) {
      const signOutCtrl = this._resetController('signOut');
      signOutEl.addEventListener(
        'click',
        () => this.app.events.emit('requestDeauthorizeTrello'),
        { signal: signOutCtrl.signal },
      );
    }

    // authorize
    const authorizeEl = this.popup.querySelector('#g2tAuthorize');
    if (authorizeEl) {
      const authorizeCtrl = this._resetController('authorize');
      authorizeEl.addEventListener(
        'click',
        () => this.app.events.emit('checkTrelloAuthorized'),
        { signal: authorizeCtrl.signal },
      );
    }

    // addToTrello button
    const addToTrelloEl = this.popup.querySelector('#addToTrello');
    if (addToTrelloEl) {
      const addToTrelloCtrl = this._resetController('addToTrello');
      addToTrelloEl.addEventListener('click', () => this.form.submit(), {
        signal: addToTrelloCtrl.signal,
      });
    }

    // position temp data handler
    const positionTempEl = this.popup.querySelector('#g2tPosition');
    if (positionTempEl) {
      const posTempCtrl = this._resetController('positionTemp');
      positionTempEl.addEventListener(
        'change',
        () => {
          this.app.temp.position =
            this.popup.querySelector('#g2tPosition').value;
        },
        { signal: posTempCtrl.signal },
      );
    }

    // due date temp handler
    const dueDateEl = this.popup.querySelector('#g2tDue_Date');
    if (dueDateEl) {
      const dueDateCtrl = this._resetController('dueDate');
      dueDateEl.addEventListener(
        'change',
        () => {
          this.app.temp.dueDate =
            this.popup.querySelector('#g2tDue_Date').value;
        },
        { signal: dueDateCtrl.signal },
      );
    }

    // due time temp handler
    const dueTimeEl = this.popup.querySelector('#g2tDue_Time');
    if (dueTimeEl) {
      const dueTimeCtrl = this._resetController('dueTime');
      dueTimeEl.addEventListener(
        'change',
        () => {
          this.app.temp.dueTime =
            this.popup.querySelector('#g2tDue_Time').value;
        },
        { signal: dueTimeCtrl.signal },
      );
    }

    // title input
    const titleEl = this.popup.querySelector('#g2tTitle');
    if (titleEl) {
      const titleCtrl = this._resetController('title');
      titleEl.addEventListener(
        'input',
        () => {
          this.app.temp.title = this.popup.querySelector('#g2tTitle').value;
          this.form.updateSubmitAvailable();
        },
        { signal: titleCtrl.signal },
      );
    }

    // description input
    const descEl = this.popup.querySelector('#g2tDesc');
    if (descEl) {
      const descCtrl = this._resetController('desc');
      descEl.addEventListener(
        'input',
        () => {
          this.app.temp.description =
            this.popup.querySelector('#g2tDesc').value;
        },
        { signal: descCtrl.signal },
      );
    }

    // Attachment and image checkbox handlers (using event delegation for dynamic content)
    ['attachment', 'image'].forEach(tag => {
      const groupEl = this.popup.querySelector(`#g2t_${tag}`);
      if (groupEl) {
        const tagCtrl = this._resetController(`tag_${tag}`);
        groupEl.addEventListener(
          'change',
          evt => {
            if (evt.target.matches('input[type="checkbox"]')) {
              this.updateAttachmentData(tag);
            }
          },
          { signal: tagCtrl.signal },
        );
      }
    });
  }

  init() {
    // this.app.utils.log('PopupView:init');

    // Create MenuControl instance
    this.menuCtrl = new G2T.MenuControl({ app: this.app });

    // Initialize form
    this.form.init();

    // Bind internal events
    this.bindEvents();

    // inject a button & a popup
    // this.finalCreatePopup(); // Moved to handleDetectButton for now
  }

  handleGmailViewChanged() {
    this.validateButtonState();
    if (!this.toolBar || !document.contains(this.toolBar)) {
      this.handleDetectButton();
    }
  }

  handleGmailLoaded() {
    this.handleDetectButton();
  }
}

// Export the class
G2T.PopupView = PopupView;

// end, class_popupView.js
