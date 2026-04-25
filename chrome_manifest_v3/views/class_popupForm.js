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
  }

  init() {
    this.isInitialized = true;
    this.bindEvents();
  }

  onDomReady() {
    if (this.domReady) {
      return;
    }
    const $popup = this.parent?.$popup;
    if (!$popup || !$popup.length) {
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
    const $popup = this.parent?.$popup;
    if (!$popup || !$popup.length) {
      return;
    }

    const bindToggle = (selector, key) => {
      const $element = $(selector, $popup);
      if (!$element.length) {
        return;
      }
      $element
        .off('change.g2tPopupForm')
        .on('change.g2tPopupForm', () => {
          this.app.persist[key] = $element.is(':checked');
          this.updateBody();
        });
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
    const $popup = this.parent?.$popup;
    if (!$popup || !$popup.length) {
      return;
    }

    $popup
      .off('keyup.g2tCheckbox', '.g2t-checkbox')
      .on('keyup.g2tCheckbox', '.g2t-checkbox', evt => {
        if (evt.which === 13 || evt.which === 32) {
          $(evt.target).trigger('click');
        }
      });

    $popup
      .off('keydown.g2tCheckbox', '.g2t-checkbox')
      .on('keydown.g2tCheckbox', '.g2t-checkbox', evt => {
        if (evt.which === 13 || evt.which === 32) {
          $(evt.target).trigger('mousedown');
        }
      });

    this.accessibilityHandlersBound = true;
  }

  syncCheckboxesFromPersist() {
    if (!this.domReady) {
      return;
    }
    const $popup = this.parent?.$popup;
    if (!$popup || !$popup.length) {
      return;
    }

    const setChecked = (selector, value) => {
      if (value === undefined) {
        return;
      }
      $(selector, $popup).prop('checked', !!value);
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

    if (this.parent.$popupContent) {
      this.parent.$popupContent.show();
    }
    this.hideMessage();
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
    $('.header a').each(() => {
      $(document).on('keyup', $(this), evt => {
        if (evt.which == 13 || evt.which == 32) {
          $(evt.target).trigger('click');
        }
      });
    });
    $('#g2tSignOutButton', this.parent.$popup).on('click', () => {
      this.parent.showSignOutOptions();
    });

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

        const $g2t = $('#g2tDue_Shortcuts', this.parent.$popup);
        $g2t.html(''); // Clear it.

        let opt =
          '<option value="none" selected disabled hidden>-</option>' +
          '<option value="d=0 am=0">--</option>';

        Object.entries(due).forEach(([key, value]) => {
          // value is already available from the callback parameter
          if (typeof value === 'object') {
            opt += `<optgroup label="${key}">`;
            Object.entries(value).forEach(([key1, value1]) => {
              // value1 is already available from the callback parameter
              opt += `<option value="${value1}">${key1}</option>`;
            });
            opt += '</optgroup>';
          } else {
            opt += `<option value="${value}">${key}</option>`;
          }
        });

        if (opt) {
          $g2t.append($(opt));
        }
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
      $('#g2tAvatarImgOrText', this.parent.$popup).text(avatarText);
    } else {
      $('#g2tAvatarImgOrText', this.parent.$popup).html(
        '<img width="30" height="30" alt="' +
          me.username +
          '" src="' +
          avatarSrc +
          '">',
      );
    }

    $('#g2tAvatarUrl', this.parent.$popup).attr('href', me.url);

    $('#g2tUsername', this.parent.$popup)
      .attr('href', me.url)
      .text(me.username || '?');

    // Attach reportError function to report id if in text:
    $('#report', this.parent.$popup).on('click', () => {
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
      $('#g2tDesc', this.parent.$popup).val(this.app.temp.description);
      $('#g2tTitle', this.parent.$popup).val(this.app.temp.title);
    });

    this.parent.$popupMessage.hide();
    this.parent.$popupContent.show();

    // Setting up comboboxes after loading data.
    this.comboBox();
  }

  updateBody(data = {}) {
    const attribute_storage_k = this.parent.ATTRIBUTE_STORAGE;

    const markdown_k =
      data?.markdown ?? $('#chkMarkdown', this.parent.$popup).is(':checked');
    const useBackLink_k =
      data?.useBackLink ?? $('#chkBackLink', this.parent.$popup).is(':checked');
    const addCC_k =
      data?.addCC ?? $('#chkCC', this.parent.$popup).is(':checked');
    const $g2tDesc = $('#g2tDesc', this.parent.$popup);

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
        $g2tDesc.attr(name_k, val_k);
      });
    } else {
      // Restore data values from description object attributes:
      fields.forEach(value => {
        const name_k = attribute_storage_k + value;
        const val_k = $g2tDesc.attr(name_k) || '';
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

    $g2tDesc.val(val_k);
    $g2tDesc.change();
  }

  mime_array(tag) {
    const self = this;
    const tag_formatted = `#${tag} input[type="checkbox"]`;
    const $jTags = $(tag_formatted, self.parent.$popup);
    const array = [];
    let item = {};
    let checked_total = 0;

    $jTags.each(function () {
      const checked = $(this).is(':checked');
      if (checked) {
        checked_total++;
      }
      item = {
        url: $(this).attr('url'),
        name: $(this).attr('name'),
        mimeType: $(this).attr('mimeType'),
        checked,
      };
      array.push(item);
    });

    return { array, checked_total };
  }

  reset() {
    // Reset form to initial state
    $('#g2tCardName', this.parent.$popup).val('');
    $('#g2tCardDesc', this.parent.$popup).val('');
    $('#g2tBoard', this.parent.$popup).val('');
    $('#g2tList', this.parent.$popup).val('');

    // Clear checkboxes
    $('input[type="checkbox"]', this.parent.$popup).prop('checked', false);
  }

  // Helper function for getting active IDs from button groups
  getButtonGroupActiveIDs(tag = '') {
    if (!tag) {
      return '';
    }
    return $(`#g2t_${tag} button.active`, this.parent.$popup)
      .map(function (iter, item) {
        return $(item).attr(`trelloId-${tag}`);
      })
      .get()
      .join();
  }

  // Update submit button availability based on required fields
  updateSubmitAvailable() {
    const isAvailable = !!(
      this.app.persist.boardId &&
      this.app.persist.listId &&
      this.app.temp.title
    );
    $('#addToTrello', this.parent.$popup).attr(
      'disabled',
      isAvailable ? false : 'disabled',
    );
  }

  // UI Updates
  updateBoards(tempId = 0) {
    const boards = this.app.temp.boards || [];
    const $boardSelect = $('#g2tBoard', this.parent.$popup);

    $boardSelect.empty();
    $boardSelect.append('<option value="">Select a board...</option>');

    boards.forEach(board => {
      $boardSelect.append(`<option value="${board.id}">${board.name}</option>`);
    });

    // Use consistent restoreId logic like updateLists/updateCards
    const prev_item_k = this.app.persist.boardId || '';

    const updatePending_k = this.parent.updatesPending[0]?.boardId
      ? this.parent.updatesPending.shift().boardId
      : '';

    // For boards, we don't default to first item - we want "Select a board..." to show
    const restoreId_k = updatePending_k || tempId || prev_item_k || '';

    // Always explicitly set the value
    $boardSelect.val(restoreId_k);
  }

  updateLists(tempId = 0) {
    const array_k = this.app.temp.lists || [];

    if (!array_k) {
      return;
    }

    const boardId_k = $('#g2tBoard', this.parent.$popup).val();

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

    const $g2t = $('#g2tList', this.parent.$popup);
    $g2t.html('');

    array_k.forEach(item => {
      const id_k = item.id;
      const display_k = item.name;
      const selected_k = id_k == restoreId_k;
      $g2t.append(
        $('<option>')
          .attr('value', id_k)
          .prop('selected', selected_k)
          .append(display_k),
      );
    });

    $g2t.change();
  }

  updateCards(tempId = 0) {
    const new_k = '<option value="-1">(new card at top)</option>';

    const array_k = this.app.temp.cards || [];

    if (!array_k) {
      return;
    }

    const listId_k = $('#g2tList', this.parent.$popup).val();

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

    const $g2t = $('#g2tCard', this.parent.$popup);
    $g2t.html(new_k);

    array_k.forEach(item => {
      const id_k = item.id;
      const display_k = this.app.utils.truncate(item.name, 80, '...');
      const selected_k = id_k == restoreId_k;
      $g2t.append(
        $('<option>')
          .attr('value', id_k)
          .prop('pos', item.pos)
          .prop('members', item.idMembers)
          .prop('labels', item.idLabels)
          .prop('selected', selected_k)
          .append(display_k),
      );
    });

    $g2t.change();
  }

  updateLabels() {
    const labels = this.app.temp.labels;
    const $g2t = $('#g2t_label', this.parent.$popup);
    $g2t.html(''); // Clear out

    for (let i = 0; i < labels.length; i++) {
      const item = labels[i];
      if (item.name?.length > 0) {
        const $color = $("<div id='g2t_temp'>").css('color', item.color);
        const bkColor = this.app.utils.luminance($color.css('color')); // If you'd like to determine whether to make the background light or dark
        $g2t.append(
          $('<button>')
            .attr('trelloId-label', item.id)
            .css('border-color', item.color)
            // .css("background-color", bkColor)
            .append(item.name)
            .on('mousedown mouseup', evt => {
              const elm = $(evt.currentTarget);
              this.parent.toggleActiveMouseDown(elm);
              // Update persist.labelsId when label selection changes
              this.app.persist.labelsId = this.getButtonGroupActiveIDs('label');
            })
            .on('keypress', evt => {
              const trigger_k =
                evt.which == 13 ? 'mousedown' : evt.which == 32 ? 'click' : '';
              if (trigger_k) {
                $(evt.target).trigger(trigger_k);
              }
            }),
        );
      }
    }

    $('#g2t_label_msg', this.parent.$popup).hide();

    this.parent.menuCtrl.reset({
      selectors: '#g2t_label button',
      nonexclusive: true,
    });

    const boardId = $('#g2tBoard', this.parent.$popup).val();
    if (
      this.app.persist.boardId &&
      this.app.persist.boardId === boardId &&
      this.app.persist.labelsId
    ) {
      const settingId = this.app.persist.labelsId;
      for (let i = 0; i < labels.length; i++) {
        const item = labels[i];
        if (settingId.indexOf(item.id) !== -1) {
          $(
            '#g2t_label button[trelloId-label="' + item.id + '"]',
            this.parent.$popup,
          ).trigger('click');
        }
      }
    } else {
      this.app.persist.labelsId = ''; // Labels do not have to be set, so no default.
    }

    $g2t.show();
  }

  updateMembers() {
    const members = this.app.temp.members;
    const $g2t = $('#g2tMembers', this.parent.$popup);
    $g2t.html(''); // Clear out

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
        $g2t.append(
          $('<button>')
            .attr('trelloId-member', item.id)
            .attr('title', item.fullName + ' @' + item.username || '?')
            .attr('class', 'g2t-holder-button')
            .append(
              $('<img>')
                .attr('src', avatar)
                .attr('width', size_k)
                .attr('height', size_k),
            )
            .append(' ' + txt)
            .on('mousedown mouseup', evt => {
              const elm = $(evt.currentTarget);
              this.parent.toggleActiveMouseDown(elm);
              // Update persist.membersId when member selection changes
              this.app.persist.membersId =
                this.getButtonGroupActiveIDs('member');
            })
            // NOTE (Ace, 2021-02-08): crlf uses mousedown, spacebar uses click:
            .on('keypress', evt => {
              const trigger_k =
                evt.which == 13 ? 'mousedown' : evt.which == 32 ? 'click' : '';
              if (trigger_k) {
                $(evt.target).trigger(trigger_k);
              }
            }),
        );
      }
    }

    $('#g2t_member_msg', this.parent.$popup).hide();

    this.parent.menuCtrl.reset({
      selectors: '#g2tMembers button',
      nonexclusive: true,
    });

    if (this.app.persist.membersId?.length > 0) {
      const settingId = this.app.persist.membersId;
      for (let i = 0; i < members.length; i++) {
        const item = members[i];
        if (settingId.indexOf(item.id) !== -1) {
          $(
            '#g2tMembers button[trelloId-member="' + item.id + '"]',
            this.parent.$popup,
          ).trigger('click');
        }
      }
    } else {
      this.app.persist.membersId = '';
    }

    $g2t.show();
  }

  clearBoard() {
    const $g2t = $('#g2tBoard', this.parent.$popup);
    $g2t.html(''); // Clear it.

    $g2t.append($('<option value="">Select a board....</option>'));

    $g2t.change();
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
    const $jTags = $('#' + tag + ' input[type="checkbox"]', this.parent.$popup);
    const $jTag1 = $jTags.first();
    const checked_k = $jTag1.prop('checked') || false;
    $jTags.prop('checked', !checked_k);
  }

  // Form Display
  showMessage(parent, text) {
    // Guard against calling before DOM elements are initialized
    if (!this.parent.$popupMessage) {
      this.app.utils.log(
        'PopupForm:showMessage: DOM not ready, deferring message',
      );
      // Store message to show later when DOM is ready
      this.parent.pendingMessage = { parent, text };
      return;
    }

    this.parent.$popupMessage.html(text);

    // Attach hideMessage function to hideMsg class if in text:
    $('.hideMsg', this.parent.$popupMessage).on('click', () => {
      this.hideMessage();
    });

    $(':button', this.parent.$popupMessage).on('click', event => {
      const $status =
        $(`span#${event.target.id}`, this.parent.$popupMessage) || '';
      switch (event.target.id) {
        case 'signout':
          $status.html('Done');
          this.app.events.emit('requestDeauthorizeTrello');
          break;
        case 'reload':
          this.parent.forceSetVersion(); // Sets value for version if needing update
          $status.html('Reloading');
          window.location.reload(true);
          break;
        case 'clearCacheNow': {
          $status.html('Clearing');
          try {
            chrome.runtime.sendMessage(
              { [this.parent.CLEAR_EXT_BROWSING_DATA]: true },
              () => {
                $status.html('Done');
                setTimeout(() => {
                  $status.html('&nbsp;');
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
      if ($status.length > 0) {
        setTimeout(() => {
          $status.html('&nbsp;');
        }, 2500);
      }
    });

    this.parent.$popupMessage.show();
  }

  hideMessage() {
    // Guard against calling before DOM elements are initialized
    if (!this.parent.$popupMessage || !this.parent.$popupContent) {
      return;
    }

    if (this.parent.$popupContent.is(':hidden')) {
      // Rest of box is hidden so close it all:
      this.parent.$popup.hide(); // Parent is popup, so hide the whole thing
    } else {
      this.parent.$popupMessage.hide();
    }
  }

  displaySubmitCompleteForm(params) {
    const $form = $('#g2tForm', this.parent.$popup);
    const $success = $(
      '<div class="g2t-success">Card created successfully!</div>',
    );

    $form.hide();
    $form.after($success);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      $success.fadeOut(() => {
        $success.remove();
        $form.show();
        this.reset();
      });
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
      let errorHtml = html;
      if (resp?.status == 400) {
        errorHtml +=
          '<br><button id="reloadTrelloBoards" class="g2t-button">Reload Trello Boards</button>';
      }
      this.parent.$popupContent.html(errorHtml);
      // Keep message area hidden when rendering full error content
      if (this.parent.$popupMessage) {
        this.parent.$popupMessage.hide();
      }
      // Bind reload handler after DOM injection
      if (resp?.status == 400) {
        $('#reloadTrelloBoards', this.parent.$popup)
          .off('click')
          .on('click', () => {
            this.app.utils.log('User clicked reload Trello boards button');
            this.app.model.loadTrelloUser();
            this.parent.reset(); // Hide error message and show popup content
          });
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
    const $jVals = { Board: '', Card: '', List: '' };
    const setJQueryVals = () => {
      Object.entries($jVals).forEach(([key, $value]) => {
        $jVals[key] = $(`#g2t${key}`, this.parent.$popup);
      });
    };
    const set_max_autocomplete_size = () => {
      const max_k = window.innerHeight;
      const $board_k = $jVals.Board;
      const popup_offset_k = this.parent.$popup.offset();
      const popup_top_k = popup_offset_k.top;
      const board_height_k = $board_k.outerHeight();
      const calc_k = max_k - popup_top_k - board_height_k - 90;
      const val_k = calc_k > this.parent.size_k.text.min ? calc_k : '60%';
      $('.ui-autocomplete').css('max-height', val_k);
    };
    if (!update) {
      setTimeout(() => {
        this.parent.comboInitialized = true;
        setJQueryVals();
        Object.entries($jVals).forEach(([key, $value]) => {
          $value.g2t_combobox();
        });
        set_max_autocomplete_size();
      }, 1000);
    } else if (this.parent.comboInitialized) {
      setJQueryVals();
      Object.entries($jVals).forEach(([key, $value]) => {
        $value.g2t_combobox(
          'setInputValue',
          $value.children('option:selected').text(),
        );
      });
      set_max_autocomplete_size();
    }
  }

  mime_html(tag, isImage, data) {
    const self = this;
    let html = '';
    let img = '';
    let img_big = '';
    const domTag_k = `#g2t_${tag.toLowerCase()}`;
    const $domTag = $(domTag_k, this.parent.$popup);

    const domTagContainer = domTag_k + '_container';
    const $domTagContainer = $(domTagContainer, this.parent.$popup);
    $domTagContainer.css('display', data[tag].length > 0 ? 'block' : 'none');

    if (isImage && isImage === true) {
      img =
        '<div class="img-container"><img src="%url%" alt="%name%" /></div> ';
    }

    let x = 0;
    data[tag].forEach(item => {
      const dict = {
        url: item.url,
        name: item.name,
        mimeType: item.mimeType,
        img,
        id: `${item.name}:${x}`,
      };

      if (tag == 'attachment') {
        html += this.app.utils.replacer(
          '<div class="imgOrAttach textOnlyPopup" title="%name%"><input type="checkbox" id="%id%" class="g2t-checkbox" mimeType="%mimeType%" name="%name%" url="%url%" checked /><label for="%id%">%name%</label></div>',
          dict,
        );
      } else if (tag == 'image') {
        html += this.app.utils.replacer(
          '<div class="imgOrAttach"><input type="checkbox" id="%id%" mimeType="%mimeType%" class="g2t-checkbox" name="%name%" url="%url%" /><label for="%id%" title="%name%"> %img% </label></div>',
          dict,
        );
      }
      x++;
    });

    $domTag.html(html);

    if (isImage && isImage === true) {
      $('img', $domTag).each(function () {
        const $img = $(this);
        $img
          .on('error', function () {
            $img.attr(
              'src',
              chrome.runtime.getURL('images/doc-question-mark-512.png'),
            );
          })
          .tooltip({
            track: true,
            content: function () {
              const dict = {
                src: $img.attr('src'),
                alt: $img.attr('alt'),
              };
              return self.app.utils.replacer('<img src="%src%">%alt%', dict);
            },
          });
      });
      $('.textOnlyPopup').tooltip({
        track: true,
      });
    }
  }

  // Form Actions
  submit() {
    if (this.parent.$popupContent) {
      this.parent.$popupContent.hide();
    }
    this.showMessage(this.parent, 'Submitting to Trello...');
    this.app.events.emit('submit');
  }

  // Form Event Handlers
  handleBoardChanged(target, params) {
    const boardId = $(target).val();
    if (boardId) {
      this.app.persist.boardId = boardId;
      this.app.events.emit('boardChanged', { boardId });
    }
  }

  handleListChanged(target, params) {
    const listId = $(target).val();
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
    if ($.isEmptyObject(data)) {
      return;
    }

    // Merge with existing state
    Object.assign(data, this.app.persist || {});
    this.updateBody(data);

    $('#g2tTitle', this.parent.$popup).val(data.subject);

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
      $('#g2tPosition', this.parent.$popup).val('to');
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
