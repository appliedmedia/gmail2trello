var G2T = G2T || {}; // must be var to guarantee correct scope - do not alter this line

class PopupForm {
  static get ck() {
    // class keys here to assure they're treated like consts
    const ck = {
      id: 'g2t_popupform',
    };
    return ck;
  }

  get ck() {
    return PopupForm.ck;
  }

  constructor(args) {
    this.parent = args.parent;
    this.app = args.app;
    this.isInitialized = false;
    this.domReady = false;
    this.persistReady = false;
    this.checkboxHandlersBound = false;
    this.accessibilityHandlersBound = false;
    this.dataBound = false;
    this.pendingGmailData = null;
    this.lastGmailData = null;
    this._submitting = false;
    // AbortControllers for namespaced event-listener groups
    this.controllers = {};
  }

  init() {
    this.isInitialized = true;
    this.bindEvents();
  }

  onDomReady() {
    if (this.domReady) {
      return;
    }
    const popup = this.parent?.popup;
    if (!popup) {
      return;
    }

    this.domReady = true;
    this.dataBound = false;
    this.bindCheckboxHandlers();
    this.bindCheckboxAccessibilityHandlers();
    this.syncCheckboxesFromPersist();
    if (!this.pendingGmailData && this.lastGmailData) {
      this.pendingGmailData = this.lastGmailData;
    }
    this.maybeHydrateGmail();
  }

  onPersistReady() {
    if (this.persistReady) {
      return;
    }
    this.persistReady = true;
    this.syncCheckboxesFromPersist();
    this.maybeHydrateGmail();
  }

  bindCheckboxHandlers() {
    if (this.checkboxHandlersBound) {
      return;
    }
    const popup = this.parent?.popup;
    if (!popup) {
      return;
    }

    const bindToggle = (selector, key) => {
      const element = popup.querySelector(selector);
      if (!element) {
        return;
      }
      // Abort any prior listener for this selector, then re-bind
      const ctrlKey = 'change_' + key;
      if (this.controllers[ctrlKey]) {
        this.controllers[ctrlKey].abort();
      }
      this.controllers[ctrlKey] = new AbortController();
      element.addEventListener(
        'change',
        () => {
          this.app.persist[key] = element.checked;
          this.updateBody();
        },
        { signal: this.controllers[ctrlKey].signal },
      );
    };

    bindToggle('#chkBackLink', 'useBackLink');
    bindToggle('#chkCC', 'addCC');
    bindToggle('#chkMarkdown', 'markdown');

    this.checkboxHandlersBound = true;
  }

  bindCheckboxAccessibilityHandlers() {
    if (this.accessibilityHandlersBound) {
      return;
    }
    const popup = this.parent?.popup;
    if (!popup) {
      return;
    }

    // Abort prior keyup handler, then re-bind
    if (this.controllers.keyupCheckbox) {
      this.controllers.keyupCheckbox.abort();
    }
    this.controllers.keyupCheckbox = new AbortController();
    popup.addEventListener(
      'keyup',
      evt => {
        if (evt.target.matches('.g2t-checkbox')) {
          if (evt.which === 13 || evt.which === 32) {
            evt.target.click();
          }
        }
      },
      { signal: this.controllers.keyupCheckbox.signal },
    );

    // Abort prior keydown handler, then re-bind
    if (this.controllers.keydownCheckbox) {
      this.controllers.keydownCheckbox.abort();
    }
    this.controllers.keydownCheckbox = new AbortController();
    popup.addEventListener(
      'keydown',
      evt => {
        if (evt.target.matches('.g2t-checkbox')) {
          if (evt.which === 13 || evt.which === 32) {
            evt.target.dispatchEvent(new Event('mousedown'));
          }
        }
      },
      { signal: this.controllers.keydownCheckbox.signal },
    );

    this.accessibilityHandlersBound = true;
  }

  syncCheckboxesFromPersist() {
    if (!this.domReady) {
      return;
    }
    const popup = this.parent?.popup;
    if (!popup) {
      return;
    }

    const setChecked = (selector, value) => {
      if (value === undefined) {
        return;
      }
      const el = popup.querySelector(selector);
      if (el) {
        el.checked = !!value;
      }
    };

    const { useBackLink, addCC, markdown } = this.app.persist;
    setChecked('#chkBackLink', useBackLink);
    setChecked('#chkCC', addCC);
    setChecked('#chkMarkdown', markdown);
  }

  maybeHydrateGmail() {
    if (!this.domReady || !this.persistReady || !this.pendingGmailData) {
      return;
    }

    const gmailData = this.pendingGmailData;
    this.pendingGmailData = null;

    if (!this.dataBound) {
      this.bindData();
      this.dataBound = true;
    }

    this.bindGmailData(gmailData);
    this.lastGmailData = gmailData;
    this.updateBoards();

    if (this.parent.popupContent) {
      this.parent.popupContent.style.display = '';
    }
    this.hideMessage();

    // Re-evaluate submit enablement after hydration. Required because the
    // input/change listeners only fire on user interaction; programmatic
    // .value writes during data binding do not.
    this.updateSubmitAvailable();
  }

  handleGmailDataReady(event, params) {
    // Both Trello and Gmail data are ready - do final assembly
    this.pendingGmailData = params?.gmail || this.app.model.gmail;
    this.maybeHydrateGmail();
  }

  /** This is what we'd submit originally for update to trello:
    //  validateData() {
        // Labels, members, attachment, image, and popupWidth are now handled by their respective change handlers
        this.app.temp.newCard = {
            emailId: this.app.temp.emailId,
            boardId: this.app.persist.boardId,
            listId: this.app.persist.listId,
            cardId: this.app.persist.cardId,
            cardPos: this.app.temp.cardPos,
            cardMembers: this.app.temp.cardMembers,
            cardLabels: this.app.temp.cardLabels,
            labelsId: this.app.persist.labelsId,
            membersId: this.app.persist.membersId,
            dueDate: this.app.temp.dueDate,
            dueTime: this.app.temp.dueTime,
            title: this.app.temp.title,
            description: this.app.temp.description,
            attachment: this.app.temp.attachment || [],
            image: this.app.temp.image || [],
            useBackLink: this.app.persist.useBackLink,
            addCC: this.app.persist.addCC,
            markdown: this.app.persist.markdown,
            popupWidth: this.app.persist.popupWidth,
            position: this.app.temp.position,
            timeStamp: this.app.temp.timeStamp,
        };
    }
    **/

  bindData(data) {
    const popup = this.parent.popup;

    for (const _a of document.querySelectorAll('.header a')) {
      document.addEventListener('keyup', evt => {
        if (evt.which == 13 || evt.which == 32) {
          evt.target.click();
        }
      });
    }
    const signOutBtn = popup.querySelector('#g2tSignOutButton');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', () => {
        this.parent.showSignOutOptions();
      });
    }

    try {
      chrome.storage.sync.get('dueShortcuts', response => {
        // Borrowed from options file until this gets persisted everywhere:
        const dueShortcuts_k = JSON.stringify({
          today: {
            am: 'd+0 am=9:00',
            noon: 'd+0 pm=12:00',
            pm: 'd+0 pm=3:00',
            end: 'd+0 pm=6:00',
            eve: 'd+0 pm=11:00',
          },
          tomorrow: {
            am: 'd+1 am=9:00',
            noon: 'd+1 pm=12:00',
            pm: 'd+1 pm=3:00',
            end: 'd+1 pm=6:00',
            eve: 'd+1 pm=11:00',
          },
          'next monday': {
            am: 'd=monday am=9:00',
            noon: 'd=monday pm=12:00',
            pm: 'd=monday pm=3:00',
            end: 'd=monday pm=6:00',
            eve: 'd=monday pm=11:00',
          },
          'next friday': {
            am: 'd=friday am=9:00',
            noon: 'd=friday pm=12:00',
            pm: 'd=friday pm=3:00',
            end: 'd=friday pm=6:00',
            eve: 'd=friday pm=11:00',
          },
        });

        const due = JSON.parse(response.dueShortcuts || dueShortcuts_k);

        const g2t = popup.querySelector('#g2tDue_Shortcuts');
        g2t.replaceChildren();

        // Build option elements natively (no HTML strings)
        const placeholderOpt = new Option('-', 'none');
        placeholderOpt.selected = true;
        placeholderOpt.disabled = true;
        placeholderOpt.hidden = true;
        g2t.append(placeholderOpt);
        g2t.append(new Option('--', 'd=0 am=0'));

        Object.entries(due).forEach(([key, value]) => {
          if (typeof value === 'object') {
            const group = document.createElement('optgroup');
            group.label = key;
            Object.entries(value).forEach(([key1, value1]) => {
              group.append(new Option(key1, value1));
            });
            g2t.append(group);
          } else {
            g2t.append(new Option(key, value));
          }
        });
      });
    } catch (error) {
      this.parent.handleChromeAPIError(error, 'bindData');
    }

    // No longer need to check for data since we access app state directly

    // State is managed centrally by app.persist - no need to set this.parent.state

    // bind trello data - user data is now in app.persist.user
    const me = this.app.persist.user || {}; // First member is always this user

    const avatarUrl = me.avatarUrl || '';
    const avatarSrc = this.app.utils.makeAvatarUrl({ avatarUrl });
    let avatarText = '';
    let initials = '?';

    const avatarEl = popup.querySelector('#g2tAvatarImgOrText');
    if (!avatarSrc) {
      if (me.initials?.length > 0) {
        initials = me.initials;
      } else if (me.fullName?.length > 1) {
        const matched = me.fullName.match(/^(\w).*?[\s\\W]+(\w)\w*$/);
        if (matched && matched.length > 1) {
          initials = matched[1] + matched[2]; // 0 is whole string
        }
      } else if (me.username?.length > 0) {
        initials = me.username.slice(0, 1);
      }

      avatarText = initials.toUpperCase();
      if (avatarEl) {
        avatarEl.textContent = avatarText;
      }
    } else {
      if (avatarEl) {
        const img = document.createElement('img');
        img.width = 30;
        img.height = 30;
        img.alt = me.username;
        img.src = avatarSrc;
        avatarEl.replaceChildren(img);
      }
    }

    const avatarUrlEl = popup.querySelector('#g2tAvatarUrl');
    if (avatarUrlEl) {
      avatarUrlEl.setAttribute('href', me.url);
    }

    const usernameEl = popup.querySelector('#g2tUsername');
    if (usernameEl) {
      usernameEl.setAttribute('href', me.url);
      usernameEl.textContent = me.username || '?';
    }

    // Attach reportError function to report id if in text:
    const reportEl = popup.querySelector('#report');
    if (reportEl) {
      reportEl.addEventListener('click', () => {
        this.reset();

        const lastError_k =
          (this.parent.lastError || '') + (this.parent.lastError ? '\n' : '');

        const user_k = this.app.persist.user || {};
        const username_k = user_k?.username || '';
        const fullname_k = user_k?.fullName || '';
        const date_k = new Date().toISOString().substring(0, 10);

        // Modify this.data directly for error reporting
        let persistData = '';
        try {
          persistData = JSON.stringify(this.app.persist);
        } catch (e) {
          persistData = `[Error serializing persist data: ${e.message}]`;
        }

        this.app.temp.description =
          lastError_k + persistData + '\n' + this.app.utils.log();
        this.app.temp.title =
          'Error report card: ' +
          [fullname_k, username_k].join(' @') +
          ' ' +
          date_k;

        this.updateBoards('52e1397addf85d4751f99319'); // GtT board
        const descEl = popup.querySelector('#g2tDesc');
        if (descEl) {
          descEl.value = this.app.temp.description;
        }
        const titleEl = popup.querySelector('#g2tTitle');
        if (titleEl) {
          titleEl.value = this.app.temp.title;
        }
      });
    }

    this.parent.popupMessage.style.display = 'none';
    this.parent.popupContent.style.display = '';

    // Setting up comboboxes after loading data.
    this.comboBox();
  }

  updateBody(data = {}) {
    const attribute_storage_k = this.parent.ATTRIBUTE_STORAGE;
    const popup = this.parent.popup;

    const markdown_k =
      data?.markdown ?? popup.querySelector('#chkMarkdown').checked;
    const useBackLink_k =
      data?.useBackLink ?? popup.querySelector('#chkBackLink').checked;
    const addCC_k = data?.addCC ?? popup.querySelector('#chkCC').checked;
    const g2tDesc = popup.querySelector('#g2tDesc');

    const fields = [
      'bodyAsRaw',
      'bodyAsMd',
      'linkAsRaw',
      'linkAsMd',
      'emailId',
    ];
    const valid_data_k = fields.every(field => !!data?.[field]);

    fields.push('ccAsRaw', 'ccAsMd'); // These are conditional

    if (valid_data_k) {
      // Store data in description object attributes:
      fields.forEach(value => {
        const val_k = data[value] || '';
        const name_k = attribute_storage_k + value;
        g2tDesc.setAttribute(name_k, val_k);
      });
    } else {
      // Restore data values from description object attributes:
      fields.forEach(value => {
        const name_k = attribute_storage_k + value;
        const val_k = g2tDesc.getAttribute(name_k) || '';
        data[value] = val_k;
      }); // WARNING (Ace, 2021-01-04): this might override data.emailId when we don't want it to
    }

    const body_k = markdown_k ? data.bodyAsMd : data.bodyAsRaw;
    const link_k = useBackLink_k
      ? markdown_k
        ? data.linkAsMd
        : data.linkAsRaw
      : '';
    const cc_k = addCC_k ? (markdown_k ? data.ccAsMd : data.ccAsRaw) : '';
    const desc_k = this.app.utils.truncate(
      body_k,
      this.parent.MAX_BODY_SIZE - (link_k.length + cc_k.length),
      '...',
    );
    const val_k = link_k + cc_k + desc_k;

    g2tDesc.value = val_k;
    g2tDesc.dispatchEvent(new Event('change'));
  }

  mime_array(tag) {
    const popup = this.parent.popup;
    const tag_formatted = `#${tag} input[type="checkbox"]`;
    const tags = popup.querySelectorAll(tag_formatted);
    const array = [];
    let item = {};
    let checked_total = 0;

    for (const t of tags) {
      const checked = t.checked;
      if (checked) {
        checked_total++;
      }
      item = {
        url: t.getAttribute('url'),
        name: t.getAttribute('name'),
        mimeType: t.getAttribute('mimeType'),
        checked,
      };
      array.push(item);
    }

    return { array, checked_total };
  }

  reset() {
    const popup = this.parent.popup;
    const titleEl = popup.querySelector('#g2tTitle');
    if (titleEl) {
      titleEl.value = '';
    }
    const descEl = popup.querySelector('#g2tDesc');
    if (descEl) {
      descEl.value = '';
    }
    const boardEl = popup.querySelector('#g2tBoard');
    if (boardEl) {
      boardEl.value = '';
    }
    const listEl = popup.querySelector('#g2tList');
    if (listEl) {
      listEl.value = '';
    }

    // Clear checkboxes
    for (const cb of popup.querySelectorAll('input[type="checkbox"]')) {
      cb.checked = false;
    }
  }

  // Helper function for getting active IDs from button groups
  getButtonGroupActiveIDs(tag = '') {
    if (!tag) {
      return '';
    }
    const popup = this.parent.popup;
    return Array.from(popup.querySelectorAll(`#g2t_${tag} button.active`))
      .map(item => item.getAttribute(`trelloId-${tag}`))
      .join();
  }

  // Update submit button availability based on required fields
  updateSubmitAvailable() {
    const isAvailable = !!(
      this.app.persist.boardId &&
      this.app.persist.listId &&
      this.app.temp.title
    );
    const popup = this.parent.popup;
    const addToTrelloBtn = popup.querySelector('#addToTrello');
    if (addToTrelloBtn) {
      addToTrelloBtn.disabled = !isAvailable;
    }
  }

  // UI Updates
  updateBoards(tempId = 0) {
    const boards = this.app.temp.boards || [];
    const popup = this.parent.popup;
    const boardSelect = popup.querySelector('#g2tBoard');

    boardSelect.replaceChildren();
    boardSelect.append(new Option('Select a board...', ''));

    boards.forEach(board => {
      boardSelect.append(new Option(board.name, board.id));
    });

    // Use consistent restoreId logic like updateLists/updateCards
    const prev_item_k = this.app.persist.boardId || '';

    const updatePending_k = this.parent.updatesPending[0]?.boardId
      ? this.parent.updatesPending.shift().boardId
      : '';

    // For boards, we don't default to first item - we want "Select a board..." to show
    const restoreId_k = updatePending_k || tempId || prev_item_k || '';

    // Always explicitly set the value
    boardSelect.value = restoreId_k;
  }

  updateLists(tempId = 0) {
    const array_k = this.app.temp.lists || [];

    if (!array_k) {
      return;
    }

    const popup = this.parent.popup;
    const boardId_k = popup.querySelector('#g2tBoard').value;

    const prev_item_k =
      this.app.persist.boardId == boardId_k && this.app.persist.listId
        ? this.app.persist.listId
        : 0;

    const first_item_k = array_k.length ? array_k[0].id : 0; // Default to first item

    const updatePending_k = this.parent.updatesPending[0]?.listId
      ? this.parent.updatesPending.shift().listId
      : 0;

    const restoreId_k =
      updatePending_k || tempId || prev_item_k || first_item_k || 0;

    const g2t = popup.querySelector('#g2tList');
    g2t.replaceChildren();

    array_k.forEach(item => {
      const id_k = item.id;
      const display_k = item.name;
      const selected_k = id_k == restoreId_k;
      const opt = document.createElement('option');
      opt.value = id_k;
      opt.selected = selected_k;
      opt.append(display_k);
      g2t.append(opt);
    });

    g2t.dispatchEvent(new Event('change'));
  }

  updateCards(tempId = 0) {
    const array_k = this.app.temp.cards || [];

    if (!array_k) {
      return;
    }

    const popup = this.parent.popup;
    const listId_k = popup.querySelector('#g2tList').value;

    const prev_item_k =
      this.app.persist.listId == listId_k && this.app.persist.cardId
        ? this.app.persist.cardId
        : 0;

    const first_item_k = array_k.length ? array_k[0].id : 0; // Default to first item

    const updatePending_k = this.parent.updatesPending[0]?.cardId
      ? this.parent.updatesPending.shift().cardId
      : 0;

    const restoreId_k =
      updatePending_k || tempId || prev_item_k || first_item_k || 0;

    const g2t = popup.querySelector('#g2tCard');

    // Build the "(new card at top)" option natively, then rebuild list
    const newOpt = new Option('(new card at top)', '-1');
    g2t.replaceChildren(newOpt);

    array_k.forEach(item => {
      const id_k = item.id;
      const display_k = this.app.utils.truncate(item.name, 80, '...');
      const selected_k = id_k == restoreId_k;
      const opt = document.createElement('option');
      opt.value = id_k;
      opt.pos = item.pos;
      opt.members = item.idMembers;
      opt.labels = item.idLabels;
      opt.selected = selected_k;
      opt.append(display_k);
      g2t.append(opt);
    });

    g2t.dispatchEvent(new Event('change'));
  }

  updateLabels() {
    const labels = this.app.temp.labels;
    const popup = this.parent.popup;
    const g2t = popup.querySelector('#g2t_label');
    g2t.replaceChildren();

    for (let i = 0; i < labels.length; i++) {
      const item = labels[i];
      if (item.name?.length > 0) {
        // Color luminance probe via native computed style
        const probe = document.createElement('div');
        probe.style.color = item.color;
        document.body.append(probe);
        const bkColor = this.app.utils.luminance(getComputedStyle(probe).color); // If you'd like to determine whether to make the background light or dark
        probe.remove();

        const btn = document.createElement('button');
        btn.setAttribute('trelloId-label', item.id);
        btn.style.borderColor = item.color;
        // btn.style.backgroundColor = bkColor;
        btn.append(item.name);
        btn.addEventListener('mousedown', evt => {
          const elm = evt.currentTarget;
          this.parent.toggleActiveMouseDown(elm);
          // Update persist.labelsId when label selection changes
          this.app.persist.labelsId = this.getButtonGroupActiveIDs('label');
        });
        btn.addEventListener('mouseup', evt => {
          const elm = evt.currentTarget;
          this.parent.toggleActiveMouseDown(elm);
          // Update persist.labelsId when label selection changes
          this.app.persist.labelsId = this.getButtonGroupActiveIDs('label');
        });
        btn.addEventListener('keypress', evt => {
          const trigger_k =
            evt.which == 13 ? 'mousedown' : evt.which == 32 ? 'click' : '';
          if (trigger_k) {
            evt.target.dispatchEvent(new Event(trigger_k));
          }
        });
        g2t.append(btn);
      }
    }

    const labelMsgEl = popup.querySelector('#g2t_label_msg');
    if (labelMsgEl) {
      labelMsgEl.style.display = 'none';
    }

    this.parent.menuCtrl.reset({
      selectors: '#g2t_label button',
      nonexclusive: true,
    });

    const boardId = popup.querySelector('#g2tBoard').value;
    if (
      this.app.persist.boardId &&
      this.app.persist.boardId === boardId &&
      this.app.persist.labelsId
    ) {
      const settingId = this.app.persist.labelsId;
      for (let i = 0; i < labels.length; i++) {
        const item = labels[i];
        if (settingId.indexOf(item.id) !== -1) {
          const btnEl = popup.querySelector(
            '#g2t_label button[trelloId-label="' + item.id + '"]',
          );
          if (btnEl) {
            btnEl.click();
          }
        }
      }
    } else {
      this.app.persist.labelsId = ''; // Labels do not have to be set, so no default.
    }

    g2t.style.display = '';
  }

  updateMembers() {
    const members = this.app.temp.members;
    const popup = this.parent.popup;
    const g2t = popup.querySelector('#g2tMembers');
    g2t.replaceChildren();

    for (let i = 0; i < members.length; i++) {
      const item = members[i];
      if (item && item.id) {
        const txt = item.initials || item.username || '?';
        const avatar =
          this.app.utils.makeAvatarUrl({
            avatarUrl: item.avatarUrl || '',
          }) ||
          chrome.runtime.getURL('images/avatar_generic_profile_gry_30x30.png'); // Default generic profile
        const size_k = 20;

        const btn = document.createElement('button');
        btn.setAttribute('trelloId-member', item.id);
        btn.setAttribute('title', item.fullName + ' @' + item.username || '?');
        btn.setAttribute('class', 'g2t-holder-button');

        const img = document.createElement('img');
        img.src = avatar;
        img.width = size_k;
        img.height = size_k;
        btn.append(img);
        btn.append(' ' + txt);

        btn.addEventListener('mousedown', evt => {
          const elm = evt.currentTarget;
          this.parent.toggleActiveMouseDown(elm);
          // Update persist.membersId when member selection changes
          this.app.persist.membersId = this.getButtonGroupActiveIDs('member');
        });
        btn.addEventListener('mouseup', evt => {
          const elm = evt.currentTarget;
          this.parent.toggleActiveMouseDown(elm);
          // Update persist.membersId when member selection changes
          this.app.persist.membersId = this.getButtonGroupActiveIDs('member');
        });
        // NOTE (Ace, 2021-02-08): crlf uses mousedown, spacebar uses click:
        btn.addEventListener('keypress', evt => {
          const trigger_k =
            evt.which == 13 ? 'mousedown' : evt.which == 32 ? 'click' : '';
          if (trigger_k) {
            evt.target.dispatchEvent(new Event(trigger_k));
          }
        });

        g2t.append(btn);
      }
    }

    const memberMsgEl = popup.querySelector('#g2t_member_msg');
    if (memberMsgEl) {
      memberMsgEl.style.display = 'none';
    }

    this.parent.menuCtrl.reset({
      selectors: '#g2tMembers button',
      nonexclusive: true,
    });

    if (this.app.persist.membersId?.length > 0) {
      const settingId = this.app.persist.membersId;
      for (let i = 0; i < members.length; i++) {
        const item = members[i];
        if (settingId.indexOf(item.id) !== -1) {
          const btnEl = popup.querySelector(
            '#g2tMembers button[trelloId-member="' + item.id + '"]',
          );
          if (btnEl) {
            btnEl.click();
          }
        }
      }
    } else {
      this.app.persist.membersId = '';
    }

    g2t.style.display = '';
  }

  clearBoard() {
    const popup = this.parent.popup;
    const g2t = popup.querySelector('#g2tBoard');
    g2t.replaceChildren();

    g2t.append(new Option('Select a board....', ''));

    g2t.dispatchEvent(new Event('change'));
  }

  clearLabels() {
    this.app.persist.labelsId = '';
    this.updateLabels();
  }

  clearMembers() {
    this.app.persist.membersId = '';
    this.updateMembers();
  }

  toggleCheckboxes(tag) {
    const popup = this.parent.popup;
    const tags = popup.querySelectorAll('#' + tag + ' input[type="checkbox"]');
    const tag1 = tags[0];
    const checked_k = tag1 ? tag1.checked : false;
    for (const t of tags) {
      t.checked = !checked_k;
    }
  }

  // Form Display
  showMessage(parent, text) {
    // Guard against calling before DOM elements are initialized
    if (!this.parent.popupMessage) {
      this.app.utils.log(
        'PopupForm:showMessage: DOM not ready, deferring message',
      );
      // Store message to show later when DOM is ready
      this.parent.pendingMessage = { parent, text };
      return;
    }

    const popupMessage = this.parent.popupMessage;
    // Several call sites (signOut.html, versionUpdate.html,
    // extensionInvalidReload.html, displayExtensionInvalidReload) pass
    // HTML containing buttons that wire up below. textContent rendered
    // it as literal markup; parse via DOMParser and replace children.
    popupMessage.replaceChildren();
    const doc = new DOMParser().parseFromString(text, 'text/html');
    Array.from(doc.body.childNodes).forEach(node =>
      popupMessage.appendChild(node),
    );

    // Attach hideMessage function to hideMsg class if in text:
    for (const el of popupMessage.querySelectorAll('.hideMsg')) {
      el.addEventListener('click', () => {
        this.hideMessage();
      });
    }

    for (const btn of popupMessage.querySelectorAll('button')) {
      btn.addEventListener('click', event => {
        const statusEl =
          popupMessage.querySelector(`span#${event.target.id}`) || null;
        switch (event.target.id) {
          case 'signout':
            if (statusEl) {
              statusEl.textContent = 'Done';
            }
            this.app.events.emit('requestDeauthorizeTrello');
            break;
          case 'reload':
            this.parent.forceSetVersion(); // Sets value for version if needing update
            if (statusEl) {
              statusEl.textContent = 'Reloading';
            }
            window.location.reload(true);
            break;
          case 'clearCacheNow': {
            if (statusEl) {
              statusEl.textContent = 'Clearing';
            }
            try {
              chrome.runtime.sendMessage(
                { [this.parent.CLEAR_EXT_BROWSING_DATA]: true },
                () => {
                  if (statusEl) {
                    statusEl.textContent = 'Done';
                  }
                  setTimeout(() => {
                    if (statusEl) {
                      statusEl.textContent = '\u00a0';
                    }
                  }, 2500);
                },
              );
            } catch (error) {
              this.parent.handleChromeAPIError(error, 'showMessage');
            }
            break;
          }
          case 'showsignout':
            this.parent.showSignOutOptions();
            break;
          default:
            this.app.utils.log(
              `showMessage: ERROR unhandled case "${event.target.id}"`,
            );
        }
        if (statusEl) {
          setTimeout(() => {
            statusEl.textContent = '\u00a0';
          }, 2500);
        }
      });
    }

    popupMessage.style.display = '';
  }

  hideMessage() {
    // Guard against calling before DOM elements are initialized
    if (!this.parent.popupMessage || !this.parent.popupContent) {
      return;
    }

    const popupContent = this.parent.popupContent;
    const popupMessage = this.parent.popupMessage;

    if (popupContent.offsetParent === null) {
      // Rest of box is hidden so close it all:
      this.parent.popup.style.display = 'none'; // Parent is popup, so hide the whole thing
    } else {
      popupMessage.style.display = 'none';
    }
  }

  displaySubmitCompleteForm(params) {
    // submit() already hid popupContent and showed popupMessage with
    // "Submitting to Trello..."; replace that text with the success notice
    // and auto-restore the form after 3s so another card can be submitted.
    this.showMessage(
      this.parent,
      '<a class="hideMsg" title="Dismiss message">&times;</a>Card created successfully!',
    );

    setTimeout(() => {
      // Lazy-mount sets parent.popup = null on close; bail in that case.
      if (!this.parent.popup) return;
      if (this.parent.popupContent) {
        this.parent.popupContent.style.display = '';
      }
      this.hideMessage();
      this.reset();
    }, 3000);
  }

  displayAPIFailedForm(response) {
    const resp = response?.data || response || {};

    // Check for 400 errors and show reload option
    if (resp?.status == 400) {
      resp.statusText =
        'Board/List data may be stale. You can try reloading your Trello boards.';
    }

    const dict_k = {
      title: resp.title || 'API Request Failed',
      status: resp.status || 'Unknown',
      statusText: resp.statusText || 'Unknown error',
      responseText: resp.responseText || JSON.stringify(response),
      method: resp.method || 'Unknown',
      keys: resp.keys || 'Unknown',
    };

    // Load and display the comprehensive error template
    function displayAPIFailedForm_loadFile(html) {
      const popup = this.parent.popup;
      let errorHtml = html;
      if (resp?.status == 400) {
        errorHtml +=
          '<br><button id="reloadTrelloBoards" class="g2t-button">Reload Trello Boards</button>';
      }
      // errorHtml comes from app.utils.loadFile (a static extension asset),
      // routed through g2tTrustedTypesPolicy once Lane 5 registers it.
      this.parent.popupContent.innerHTML = window.g2tTrustedTypesPolicy
        ? window.g2tTrustedTypesPolicy.createHTML(errorHtml)
        : errorHtml;
      // Keep message area hidden when rendering full error content
      if (this.parent.popupMessage) {
        this.parent.popupMessage.style.display = 'none';
      }
      // Bind reload handler after DOM injection
      if (resp?.status == 400) {
        const reloadBtn = popup.querySelector('#reloadTrelloBoards');
        if (reloadBtn) {
          if (this.controllers.reloadTrelloBoards) {
            this.controllers.reloadTrelloBoards.abort();
          }
          this.controllers.reloadTrelloBoards = new AbortController();
          reloadBtn.addEventListener(
            'click',
            () => {
              this.app.utils.log('User clicked reload Trello boards button');
              this.app.model.loadTrelloUser();
              this.parent.reset(); // Hide error message and show popup content
            },
            { signal: this.controllers.reloadTrelloBoards.signal },
          );
        }
      }
    }
    const path = 'views/error.html';
    const dict = dict_k;
    const callback = displayAPIFailedForm_loadFile.bind(this);
    this.app.utils.loadFile({ path, dict, callback }).catch(err => {
      this.app.utils.log(
        `displayAPIFailedForm: failed to load error.html: ${err?.message || err}`,
      );
    });

    // Handle 401 errors (invalid token)
    if (resp?.status == 401) {
      this.app.events.emit('requestDeauthorizeTrello');
    }
  }

  // Form Components
  comboBox(update) {
    const jVals = { Board: '', Card: '', List: '' };
    const popup = this.parent.popup;
    const setJQueryVals = () => {
      Object.entries(jVals).forEach(([key]) => {
        const nativeEl_k = popup.querySelector(`#g2t${key}`);
        jVals[key] = nativeEl_k ? $(nativeEl_k) : $();
      });
    };
    const set_max_autocomplete_size = () => {
      const max_k = window.innerHeight;
      const board_k = popup.querySelector('#g2tBoard');
      const rect_k = popup.getBoundingClientRect();
      const popup_offset_k = {
        left: rect_k.left + window.scrollX,
        top: rect_k.top + window.scrollY,
      };
      const popup_top_k = popup_offset_k.top;
      const board_height_k = board_k ? board_k.offsetHeight : 0;
      const calc_k = max_k - popup_top_k - board_height_k - 90;
      const val_k = calc_k > this.parent.size_k.text.min ? calc_k : '60%';
      for (const el of document.querySelectorAll('.ui-autocomplete')) {
        el.style.maxHeight = typeof val_k === 'number' ? val_k + 'px' : val_k;
      }
    };
    if (!update) {
      setTimeout(() => {
        this.parent.comboInitialized = true;
        setJQueryVals();
        Object.entries(jVals).forEach(([_key, $value]) => {
          $value.g2t_combobox();
        });
        set_max_autocomplete_size();
      }, 1000);
    } else if (this.parent.comboInitialized) {
      setJQueryVals();
      Object.entries(jVals).forEach(([_key, $value]) => {
        const selectEl = $value[0];
        $value.g2t_combobox(
          'setInputValue',
          selectEl.options[selectEl.selectedIndex]?.textContent ?? '',
        );
      });
      set_max_autocomplete_size();
    }
  }

  mime_html(tag, isImage, data) {
    const self = this;
    const popup = this.parent.popup;
    const domTag_k = `#g2t_${tag.toLowerCase()}`;
    const domTag = popup.querySelector(domTag_k);

    const domTagContainerSel = domTag_k + '_container';
    const domTagContainerEl = popup.querySelector(domTagContainerSel);
    if (domTagContainerEl) {
      domTagContainerEl.style.display = data[tag].length > 0 ? 'block' : 'none';
    }

    // Build attachment/image items via DOM - no HTML strings
    domTag.replaceChildren();

    let x = 0;
    data[tag].forEach(item => {
      const id = `${item.name}:${x}`;
      const wrapper = document.createElement('div');

      if (tag == 'attachment') {
        wrapper.className = 'imgOrAttach textOnlyPopup';
        wrapper.title = item.name;

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = id;
        cb.className = 'g2t-checkbox';
        cb.setAttribute('mimeType', item.mimeType);
        cb.setAttribute('name', item.name);
        cb.setAttribute('url', item.url);
        cb.checked = true;
        wrapper.append(cb);

        const lbl = document.createElement('label');
        lbl.setAttribute('for', id);
        lbl.textContent = item.name;
        wrapper.append(lbl);
      } else if (tag == 'image') {
        wrapper.className = 'imgOrAttach';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = id;
        cb.setAttribute('mimeType', item.mimeType);
        cb.className = 'g2t-checkbox';
        cb.setAttribute('name', item.name);
        cb.setAttribute('url', item.url);
        wrapper.append(cb);

        const lbl = document.createElement('label');
        lbl.setAttribute('for', id);
        lbl.title = item.name;

        if (isImage) {
          const imgContainer = document.createElement('div');
          imgContainer.className = 'img-container';
          const imgEl = document.createElement('img');
          imgEl.src = item.url;
          imgEl.alt = item.name;
          imgContainer.append(imgEl);
          lbl.append(imgContainer);
          lbl.append(' ');
        }

        wrapper.append(lbl);
      }

      domTag.append(wrapper);
      x++;
    });

    if (isImage && isImage === true) {
      for (const imgEl of domTag.querySelectorAll('img')) {
        imgEl.addEventListener('error', function () {
          imgEl.src = chrome.runtime.getURL('images/doc-question-mark-512.png');
        });
        $(imgEl).tooltip({
          track: true,
          content: function () {
            const dict = {
              src: imgEl.getAttribute('src'),
              alt: imgEl.getAttribute('alt'),
            };
            return self.app.utils.replacer('<img src="%src%">%alt%', dict);
          },
        });
      }
      $('.textOnlyPopup').tooltip({
        track: true,
      });
    }
  }

  // Form Actions
  submit() {
    if (this.parent.popupContent) {
      this.parent.popupContent.style.display = 'none';
    }
    this.showMessage(this.parent, 'Submitting to Trello...');
    this.app.events.emit('submit');
  }

  // Form Event Handlers
  handleBoardChanged(target, params) {
    const boardId = target.value;
    if (boardId) {
      this.app.persist.boardId = boardId;
      this.app.events.emit('boardChanged', { boardId });
    }
  }

  handleListChanged(target, params) {
    const listId = target.value;
    if (listId) {
      this.app.persist.listId = listId;
      this.app.events.emit('listChanged', { listId });
    }
  }

  handleSubmit() {
    if (this._submitting) return;
    this._submitting = true;

    // Build the submission data object from app state
    const newCard = {
      emailId: this.app.temp.emailId,
      boardId: this.app.persist.boardId,
      listId: this.app.persist.listId,
      cardId: this.app.persist.cardId,
      cardPos: this.app.temp.cardPos,
      cardMembers: this.app.temp.cardMembers,
      cardLabels: this.app.temp.cardLabels,
      labelsId: this.app.persist.labelsId,
      membersId: this.app.persist.membersId,
      dueDate: this.app.temp.dueDate,
      dueTime: this.app.temp.dueTime,
      title: this.app.temp.title,
      description: this.app.temp.description,
      attachment: this.app.temp.attachment || [],
      image: this.app.temp.image || [],
      useBackLink: this.app.persist.useBackLink,
      addCC: this.app.persist.addCC,
      markdown: this.app.persist.markdown,
      popupWidth: this.app.persist.popupWidth,
      position: this.app.temp.position,
      timeStamp: this.app.temp.timeStamp,
    };

    // Pass the complete data object to model.submit
    this.parent.app.model.submit(newCard);
  }

  handleCheckTrelloAuthorized() {
    this.showMessage(this.parent.app, 'Authorizing...');
    this.parent.app.model.checkTrelloAuthorized();
  }

  handleRequestDeauthorizeTrello() {
    this.app.utils.log('onRequestDeauthorizeTrello');
    this.parent.app.model.deauthorizeTrello();
    this.clearBoard();
  }

  handleLoadTrelloLists_success() {
    this.updateLists();
  }

  handleLoadTrelloCards_success() {
    this.updateCards();
  }

  handleLoadTrelloLabels_success() {
    this.updateLabels();
  }

  handleLoadTrelloMembers_success() {
    this.updateMembers();
  }

  handleAPIFail(target, params) {
    this._submitting = false;
    this.displayAPIFailedForm(params);
  }

  handleNewCardUploadsComplete(target, params) {
    this._submitting = false;
    this.displaySubmitCompleteForm(params);
  }

  handleCreateCardFailed(target, params) {
    this._submitting = false;
    this.displayAPIFailedForm(params);
  }

  handleOnMenuClick(target, params) {
    // Handle menu clicks - delegate to parent if needed
    this.app.events.emit('menuClick', { target, params });
  }

  bindGmailData(data = {}) {
    if (!data || Object.keys(data).length === 0) {
      return;
    }

    // Merge with existing state
    Object.assign(data, this.app.persist || {});
    this.updateBody(data);

    const popup = this.parent.popup;
    const titleEl = popup.querySelector('#g2tTitle');
    if (titleEl) {
      titleEl.value = data.subject || '';
      // Mirror to app.temp so updateSubmitAvailable() can see the title.
      // Without this, the → TRELLO button stayed disabled until the user
      // typed in the title field, because app.temp.title is only written
      // by the title input's 'input' event listener.
      this.app.temp.title = data.subject || '';
    }

    this.mime_html('attachment', false, data);
    this.mime_html('image', true, data);

    // Set Gmail-derived temp values directly
    this.app.temp.emailId = data.emailId || 0;
    this.app.temp.timeStamp = data.time || '';
    // Note: attachment/image are processed by mime_array() in validateData

    const emailId = data.emailId || 0;
    const mapAvailable_k = this.app.model.emailBoardListCardMapLookup({
      emailId,
    });

    if (
      ['boardId', 'listId', 'cardId'].every(field => !!mapAvailable_k?.[field])
    ) {
      const posEl = popup.querySelector('#g2tPosition');
      if (posEl) {
        posEl.value = 'to';
      }
      this.updateBoards(mapAvailable_k.boardId);
      const listId = mapAvailable_k.listId;
      const cardId = mapAvailable_k.cardId;
      this.parent.updatesPending.push({ listId });
      this.parent.updatesPending.push({ cardId });
    }

    this.parent.dataDirty = false;
  }

  bindEvents() {
    // Form event handlers - these belong in PopupForm
    this.app.events.addListener('submit', this.handleSubmit.bind(this));
    this.app.events.addListener(
      'checkTrelloAuthorized',
      this.handleCheckTrelloAuthorized.bind(this),
    );
    this.app.events.addListener(
      'requestDeauthorizeTrello',
      this.handleRequestDeauthorizeTrello.bind(this),
    );
    this.app.events.addListener(
      'loadTrelloLists_success',
      this.handleLoadTrelloLists_success.bind(this),
    );
    this.app.events.addListener(
      'loadTrelloCards_success',
      this.handleLoadTrelloCards_success.bind(this),
    );
    this.app.events.addListener(
      'loadTrelloLabels_success',
      this.handleLoadTrelloLabels_success.bind(this),
    );
    this.app.events.addListener(
      'loadTrelloMembers_success',
      this.handleLoadTrelloMembers_success.bind(this),
    );
    this.app.events.addListener('APIFail', this.handleAPIFail.bind(this));
    this.app.events.addListener(
      'newCardUploadsComplete',
      this.handleNewCardUploadsComplete.bind(this),
    );
    this.app.events.addListener(
      'createCard_failed',
      this.handleCreateCardFailed.bind(this),
    );
    this.app.events.addListener('menuClick', this.handleOnMenuClick.bind(this));
    this.app.events.addListener(
      'gmailDataReady',
      this.handleGmailDataReady.bind(this),
    );
  }
}

// Export the class
G2T.PopupForm = PopupForm;

// End, class_popupForm.js
