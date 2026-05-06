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

  // Backward-compat shim. $popup is kept because resetDragResize() calls
  // .draggable() and .resizable() on it (jQuery-UI requires a jQuery wrapper).
  // The other shims ($popupContent, $popupMessage, $g2tButton) were deleted
  // in Wave 6 Lane 3 once popupForm migrated to read native fields.
  get $popup() {
    return this.popup ? $(this.popup) : null;
  }
  set $popup(jqVal) {
    this.popup = jqVal && jqVal[0] ? jqVal[0] : null;
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

    // One-shot guard so chrome.runtime.onMessage is only added once per app start
    this.runtimeMessageBound = false;

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

  // Bind button-only event handlers. Safe to call repeatedly; _resetController
  // aborts the prior handler before adding a new one. Called from
  // finalCreatePopup whenever the button is (re)injected, and from
  // validateButtonState Check 3 when the bound marker is missing.
  bindButtonEvents() {
    this.g2tButton = document.querySelector('#g2tButton');
    if (!this.g2tButton) {
      return false;
    }

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

    this.g2tButton.setAttribute('data-g2t-bound', '1');
    return true;
  }

  // Mount the popup HTML onto document.body and run the DOM-binding pass.
  // Returns false if the popup HTML template is not yet cached; the caller
  // should retry once finalCreatePopup's loadFile callback completes.
  mountPopup() {
    if (!this.html['popup'] || this.html['popup'].length === 0) {
      this.app.utils.log(
        'PopupView:mountPopup: popup HTML not cached, deferring',
      );
      return false;
    }
    // Strip any orphan popup before mounting fresh
    document.querySelectorAll('#g2tPopup').forEach(p => p.remove());
    this._appendHtml(document.body, this.html['popup']);
    this.handlePopupLoaded();
    return true;
  }

  finalCreatePopup() {
    if (!this.toolBar) {
      return; // button not available yet
    }

    const button = document.querySelector('#g2tButton');

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
      this.bindButtonEvents();
    } else if (button.offsetParent !== null) {
      this.app.utils.log('PopupView:confirmPopup: button visible');
      if (!button.hasAttribute('data-g2t-bound')) {
        this.bindButtonEvents();
      }
    } else {
      this.app.utils.log(
        'PopupView:confirmPopup: Button is in an inactive region. Moving...',
      );
      // Strip every existing button copy and any stray popup. The popup
      // is mounted lazily on next showPopup, so nothing of value is lost.
      document.querySelectorAll('#g2tButton').forEach(b => b.remove());
      document.querySelectorAll('#g2tPopup').forEach(p => p.remove());
      this.app.utils.log(
        'PopupView:confirmPopup: re-creating button in active toolbar',
      );
      this._appendHtml(this.toolBar, this.html['add_to_trello']);
      this.bindButtonEvents();
    }

    // Pre-cache popup HTML so the first open is fast. The popup itself is
    // not appended here; lazy mount handles that on showPopup().
    if (!this.html['popup']) {
      function cachePopupHtml(html) {
        this.html['popup'] = html;
        this.app.utils.log('PopupView:confirmPopup: popup HTML cached');
        // Drain a queued showPopup that bailed because HTML was not ready.
        // Clear the flag before re-invoking to keep the call non-recursive.
        if (this._pendingShowPopup) {
          this._pendingShowPopup = false;
          this.showPopup();
        }
      }
      const path = 'views/popupView.html';
      const callback = cachePopupHtml.bind(this);
      this.app.utils.loadFile({ path, callback }).catch(() => {
        this.app.utils.log('PopupView: failed to load popupView.html');
        // Clear the queued show; otherwise a failed load would leave
        // every subsequent button click silently queued forever.
        this._pendingShowPopup = false;
      });
    }
  }

  /**
   * Set the initial width by measuring from the left corner of the
   * "Add card" button to the edge of the window and then center that under the "Add card" button:
   */
  centerPopup(useWidth) {
    // Popup is mounted on document.body (position: absolute), button is
    // inside the Gmail toolbar. Compute viewport-relative coordinates via
    // getBoundingClientRect, then offset by page scroll for body anchoring.
    const btnRect = this.g2tButton.getBoundingClientRect();
    const g2tLeft = btnRect.left + window.scrollX;
    const g2tRight = btnRect.right + window.scrollX;
    let g2tCenter = g2tLeft + btnRect.width / 2;

    const viewportRight = window.innerWidth + window.scrollX;

    const length_from_left_k = g2tLeft * 1.5;
    const length_from_right_k = (viewportRight - g2tRight) * 1.5;
    const calcWidth_k = Math.min(length_from_left_k, length_from_right_k); // If we need a width to use

    // We'll make our popup 1.25x as wide as the button to the end of the window up to max width:
    let newPopupWidth = this.size_k.width.min;
    if (useWidth && useWidth > 0) {
      newPopupWidth = useWidth; // May snap to min if necessary
      const popupRect = this.popup.getBoundingClientRect();
      g2tCenter = popupRect.left + window.scrollX + popupRect.width / 2;
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

    // 4px gap below the button so the popup hangs cleanly off the toolbar
    const newPopupTop = btnRect.bottom + window.scrollY + 4;

    this.popup.style.width = newPopupWidth + 'px';
    this.popup.style.left = newPopupLeft + 'px';
    this.popup.style.top = newPopupTop + 'px';

    // Store initial popup width
    this.app.persist.popupWidth = newPopupWidth;
  }

  resetDragResize() {
    this.$popup.draggable({
      disabled: false,
      containment: 'window',
      // Exclude every clickable AND every text-bearing element so users
      // can copy/paste the error text without dragging the popup.
      // Original cancel only listed form controls; static text in
      // .popupMsg / .content / spans / labels still grabbed the drag.
      cancel:
        'a, button, input, select, textarea, label, span, p, h1, h2, h3, h4, h5, h6, code, pre, .ui-autocomplete, .hideMsg, .popupMsg, .popupMsg *, .content, .content *',
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
    // Bind chrome.runtime.onMessage for popup-specific messages.
    // One-shot guarded because handlePopupLoaded runs on every lazy mount,
    // and the runtime message listener should only be added once per
    // app lifetime to avoid the keyboard shortcut firing N times.
    if (this.runtimeMessageBound) {
      return;
    }
    this.app.goog.runtimeOnMessageAddListener(
      this.handleRuntimeMessage.bind(this),
    );
    this.runtimeMessageBound = true;
  }

  handlePersistLoaded() {
    if (this.form?.onPersistReady) {
      this.form.onPersistReady();
    }
  }

  showPopup() {
    // Re-resolve the button if our cached ref is stale (Gmail re-renders
    // the toolbar across view changes).
    if (!this.g2tButton || !document.body.contains(this.g2tButton)) {
      this.g2tButton = document.querySelector('#g2tButton');
    }
    if (!this.g2tButton) {
      this.app.utils.log('PopupView:showPopup: no button, ignoring');
      return;
    }

    // Lazy mount: build the popup on demand if it is not currently in the
    // DOM. Returns false if the popup HTML template has not finished
    // loading yet; queue the show so the loadFile callback can retry.
    if (!this.popup || !document.body.contains(this.popup)) {
      if (!this.mountPopup()) {
        this._pendingShowPopup = true;
        return;
      }
    }

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

    // resetting the max height on load.
    this.popup.style.maxHeight = '564px';
    this.mouseDownTracker = {};

    this.popup.style.display = 'block';

    this.app.events.emit('onPopupVisible');
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
    if (!this.popup) {
      return;
    }

    // Document-level listeners attached in showPopup
    ['keydown', 'mouseup', 'mousedown', 'focusin'].forEach(name => {
      if (this.controllers[name]) {
        this.controllers[name].abort();
        this.controllers[name] = null;
      }
    });

    // Popup-internal listeners attached in handlePopupLoaded.
    // Button-only listeners (g2tButtonMousedown / Mouseenter / Mouseleave)
    // are intentionally NOT in this list; they belong to the toolbar
    // button, which outlives the popup.
    [
      'closeBtn',
      'submit',
      'signOut',
      'authorize',
      'addToTrello',
      'boardChange',
      'listChange',
      'cardChange',
      'positionChange',
      'positionKeyup',
      'dueShortcuts',
      'positionTemp',
      'dueDate',
      'dueTime',
      'title',
      'desc',
      'tag_attachment',
      'tag_image',
      'reload',
    ].forEach(name => {
      if (this.controllers[name]) {
        this.controllers[name].abort();
        this.controllers[name] = null;
      }
    });

    // PopupForm-side controllers (checkbox + accessibility keyup)
    if (this.form?.controllers) {
      Object.keys(this.form.controllers).forEach(name => {
        if (this.form.controllers[name]) {
          this.form.controllers[name].abort();
          this.form.controllers[name] = null;
        }
      });
    }

    // Tear down the popup element entirely. Mounting inside Gmail's
    // toolbar previously caused Gmail's mutation observer to remove the
    // toolbar button as collateral damage when display flipped.
    this.popup.remove();
    this.popup = null;
    this.popupMessage = null;
    this.popupContent = null;

    // Reset binding flags so the next mount re-runs first-time setup.
    // PopupForm.persistReady and PopupForm.lastGmailData are deliberately
    // preserved; they are the "last saved state" that lets a re-opened
    // popup come back populated.
    this.isInitialized = false;
    this.comboInitialized = false;
    if (this.form) {
      this.form.domReady = false;
      this.form.checkboxHandlersBound = false;
      this.form.accessibilityHandlersBound = false;
      this.form.dataBound = false;
    }
  }

  popupVisible() {
    // Source of truth: popup element on the body with display:block.
    // Intentionally does NOT check g2tButton, since Gmail can transiently
    // remove the toolbar (and the button with it) while the popup remains
    // open and interactive on document.body.
    if (!this.popup || !document.body.contains(this.popup)) {
      return false;
    }
    return getComputedStyle(this.popup).display === 'block';
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
      this.bindButtonEvents();
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
    const pre_k = this.app.gmailView.preDetect();
    this.app.utils.log('PopupView:handleDetectButton preDetect=' + pre_k);
    if (pre_k) {
      this.toolBar = this.app.gmailView.$toolBar || null;
      this.app.utils.log(
        'PopupView:handleDetectButton toolBar=' +
          (this.toolBar ? 'set' : 'null'),
      );
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
    // Called from mountPopup() each time the popup is freshly inserted.
    // Resolves the popup-side DOM refs and binds every popup-internal
    // listener. Button-side listeners live in bindButtonEvents() and are
    // attached at button-creation time, not here.
    this.popup = document.querySelector('#g2tPopup');
    this.popupMessage = this.popup.querySelector('.popupMsg');
    this.popupContent = this.popup.querySelector('.content');
    if (!this.g2tButton || !document.body.contains(this.g2tButton)) {
      this.g2tButton = document.querySelector('#g2tButton');
    }
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

    // bindPopupEvents is one-shot guarded; calling here keeps the keyboard
    // shortcut wired even on the very first popup mount.
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

    // Bind chrome.runtime.onMessage at app start so the keyboard shortcut
    // works even before the user has opened the popup.
    this.bindPopupEvents();

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
    this.app.utils.log('PopupView:handleGmailLoaded');
    this.handleDetectButton();
  }
}

// Export the class
G2T.PopupView = PopupView;

// end, class_popupView.js
