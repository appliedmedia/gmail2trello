var G2T = G2T || {}; // must be var to guarantee correct scope - do not alter this line

// Uploader class — the single upload chain for both new-card and add-to-card
class Uploader {
  constructor(args) {
    if (!args?.parent || !args?.app) {
      return;
    }

    Object.assign(this, args);
    this.itemsForUpload = [];
    this._submitData = null;
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Uploader-specific event bindings (if any)
  }

  get attachment() {
    return 'attachment';
  }

  add(args) {
    if (
      args &&
      Object.keys(args).every(key => {
        const val = args[key];
        return (
          val != null &&
          (typeof val === 'number' ||
            typeof val === 'boolean' ||
            val.length > 0)
        );
      })
    ) {
      args.property = `cards/${this.cardId}/${args.property}`;
      this.itemsForUpload.push(args);
    }
    return this;
  }

  // Entry point — decides new card vs add-to-card, then chains through upload()
  submit(data) {
    this._submitData = data;

    if (data.position === 'to' && data.cardId) {
      // Add to existing card: queue comment + extras + attachments
      this.cardId = data.cardId;

      const text = data.description || data.body || '';
      if (text) {
        this.add({ property: 'actions/comments', text });
      }

      this._queueExtras(data);
      this._queueAttachments(data);
      this.upload();
    } else {
      // Create new card via API, then chain attachments
      this._createNewCard(data);
    }
  }

  _buildCardPayload(data) {
    let pos = 'top';
    if (data.cardPos) {
      pos = data.cardPos;
    } else if (data.position) {
      const p = String(data.position).toLowerCase();
      if (p === 'below' || p === 'bottom' || p === 'down') {
        pos = 'bottom';
      }
    }

    const payload = {
      name: data.title || data.subject || 'No Subject',
      desc: data.description || data.body || '',
      idList: data.listId,
      idBoard: data.boardId,
      pos,
    };

    const labels = data.labelsId || data.labels;
    if (labels?.length) payload.idLabels = labels;

    const members = data.membersId || data.members;
    if (members?.length) payload.idMembers = members;

    if (data.dueDate) payload.due = data.dueDate;

    return payload;
  }

  _createNewCard(data) {
    const payload = this._buildCardPayload(data);

    if (!payload.idList || !payload.idBoard) {
      this.app.events.emit('invalidFormData', { data });
      return;
    }

    this.trel.wrapApiCall(
      'post',
      'cards',
      payload,
      response => {
        this.cardId = response.id;
        data.cardId = response.id;
        this._queueAttachments(data);
        this.upload();
      },
      error => {
        this.app.events.emit('createCard_failed', { data: error });
      },
    );
  }

  _queueExtras(data) {
    const members = data.membersId || data.members;
    if (members?.length) {
      this.add({ property: 'idMembers', value: members, method: 'put' });
    }
    const labels = data.labelsId || data.labels;
    if (labels?.length) {
      this.add({ property: 'idLabels', value: labels, method: 'put' });
    }
    if (data.dueDate) {
      this.add({ property: 'due', value: data.dueDate, method: 'put' });
    }
  }

  _queueAttachments(data) {
    const attachments = [...(data.attachment || []), ...(data.image || [])];
    attachments.forEach(att => {
      this.add({
        method: 'post',
        property: 'attachment',
        value: att.url,
        name: att.name,
      });
    });
  }

  attach(method, property, upload1, success, failure) {
    const self = this;

    if (
      !property ||
      property.length < 6 ||
      !upload1 ||
      !upload1.value ||
      upload1.value.length < 6
    )
      return;

    // Use original implementation - background script handles file uploads
    const UPLOAD_ATTACH = 'g2t_upload_attach';
    const UPLOAD_ATTACH_RESULTS = 'g2t_upload_attach_results';
    const trello_url_k = 'https://api.trello.com/1/';
    const param_k = upload1.value;

    // NOTE (Ace, 2020-02-15): We have a funny problem with embedded image so breaking this up:
    // Was: const filename_k = (param_k.split('/').pop().split('#')[0].split('?')[0]) || upload1.name || param_k || 'unknown_filename'; // Removes # or ? after filename
    // Remove # or ? afer filename. Could do this as a regex, but this is a bit faster and more resiliant:
    const slash_split_k = param_k.split('/'); // First split by directory slashes
    const end_slash_split_k = slash_split_k[slash_split_k.length - 1]; // Take last slash section
    const hash_split_k = end_slash_split_k.split('#'); // Split by hash so we can split it off
    const begin_hash_split_k = hash_split_k[0]; // Take first hash
    const question_split_k = begin_hash_split_k.split('?'); // Now split by question mark to remove variables
    const begin_question_split_k = question_split_k[0]; // Take content ahead of question mark
    const filename_k =
      begin_question_split_k || upload1.name || param_k || 'unknown_filename'; // Use found string or reasonable fallbacks

    const callback = function (args) {
      if (args?.[UPLOAD_ATTACH_RESULTS] === 'success') {
        success(args);
      } else {
        failure(args);
      }
    };

    let dict = {};
    dict[UPLOAD_ATTACH] = {
      url_asset: upload1.value,
      filename: filename_k,
      trello_key: Trello.key(),
      trello_token: Trello.token(),
      url_upload: `${trello_url_k}${property}`,
    };

    this.app.goog.runtimeSendMessage(dict, callback); // Background script handles file uploads
  }

  upload() {
    const self = this;
    const generateKeysAndValues = function (object) {
      let keysAndValues = [];
      Object.entries(object).forEach(([key, value]) => {
        keysAndValues.push(
          `${key}=${value || ''} (${(value || '').toString().length})`,
        );
      });
      return keysAndValues.sort().join(' ');
    };
    let upload1 = self.itemsForUpload.shift();
    if (!upload1) {
      // Queue drained — emit completion with the original submit data
      self.app.events.emit('newCardUploadsComplete', {
        data: self._submitData,
      });
    } else {
      const dict_k = { cardId: this.cardId || '' };

      let method = upload1.method || 'post';
      let property = this.app.utils.replacer(upload1.property, dict_k);
      upload1.method = undefined;
      upload1.property = undefined;

      const successHandler = responseData => {
        Object.assign(responseData, {
          method: `${method} ${property}`,
          keys: generateKeysAndValues(upload1),
          emailId: self.emailId,
        });
        self.upload(); // continue chain (emits newCardUploadsComplete when empty)
      };

      const failureHandler = responseData => {
        Object.assign(responseData, {
          method: `${method} ${property}`,
          keys: generateKeysAndValues(upload1),
          emailId: self.emailId,
        });
        self.app.events.emit('APIFail', { data: responseData });
      };

      // Use class_trel if available, otherwise fall back to direct Trello calls
      if (this.trel) {
        if (property.endsWith(self.attachment)) {
          // Use attach method for attachments
          self.attach(
            method,
            property,
            upload1,
            successHandler,
            failureHandler,
          );
        } else {
          // Use class_trel for non-attachment calls
          this.trel.wrapApiCall(
            method,
            property,
            upload1,
            successHandler,
            failureHandler,
          );
        }
      } else {
        // Fall back to original implementation
        const fn_k = property.endsWith(self.attachment)
          ? self.attach
          : Trello.rest;

        fn_k(method, property, upload1, successHandler, failureHandler);
      }
    }
  }
}

// EmailBoardListCardMap class
class EmailBoardListCardMap {
  static get ck() {
    // class keys here to assure they're treated like consts
    const ck = {
      id: 'g2t_emailboardlistcardmap',
      key: 'g2t_eblc',
    };
    return ck;
  }

  get ck() {
    return EmailBoardListCardMap.ck;
  }

  constructor(args) {
    this.parent = args.parent;
    this.app = args.app;
    this.maxSize = 50; // Reduced from 100 to prevent storage quota issues
  }

  add(args = {}) {
    const entry = {
      email: args.email || '',
      boardId: args.boardId || 0,
      listId: args.listId || 0,
      cardId: args.cardId || 0,
      timestamp: Date.now(),
    };

    this.push(entry);
  }

  update(key_value = {}) {
    // Find existing entry with same email and update it
    const existingIndex = this.app.persist.eblcmArray.findIndex(entry => 
      entry.email === key_value.email
    );
    
    if (existingIndex !== -1) {
      // Update existing entry with new board/list/card IDs
      this.app.persist.eblcmArray[existingIndex] = {
        ...this.app.persist.eblcmArray[existingIndex],
        ...key_value,
        timestamp: Date.now()
      };
      return this.app.persist.eblcmArray[existingIndex];
    } else {
      // Add new entry if email doesn't exist
      return this.add(key_value);
    }
  }

  find(key_value = {}) {
    return this.app.persist.eblcmArray.find(entry => {
      return Object.keys(key_value).every(key => entry[key] === key_value[key]);
    });
  }

  lookup(key_value = {}) {
    const entry = this.find(key_value);
    return entry || null;
  }

  makeRoom(index = -1) {
    if (this.app.persist.eblcmArray.length >= this.maxSize) {
      if (index === -1) {
        this.app.persist.eblcmArray.shift(); // Remove oldest
      } else {
        this.app.persist.eblcmArray.splice(index, 1); // Remove specific index
      }
    }
  }

  max() {
    return this.maxSize;
  }

  maxxed() {
    return this.app.persist.eblcmArray.length >= this.maxSize;
  }

  oldest() {
    if (this.app.persist.eblcmArray.length === 0) return null;

    let oldestEntry = this.app.persist.eblcmArray[0];
    let oldestTime = oldestEntry.timestamp;

    for (let i = 1; i < this.app.persist.eblcmArray.length; i++) {
      if (this.app.persist.eblcmArray[i].timestamp < oldestTime) {
        oldestTime = this.app.persist.eblcmArray[i].timestamp;
        oldestEntry = this.app.persist.eblcmArray[i];
      }
    }

    return oldestEntry;
  }

  push(entry = {}) {
    this.makeRoom();
    this.app.persist.eblcmArray.push(entry);
  }

  remove(index = -1) {
    if (index === -1) {
      this.app.persist.eblcmArray.pop();
    } else {
      this.app.persist.eblcmArray.splice(index, 1);
    }
  }
}

class Model {
  static get ck() {
    // class keys here to assure they're treated like consts
    const ck = {
      id: 'g2t_model',
    };
    return ck;
  }

  get ck() {
    return Model.ck;
  }

  constructor(args) {
    this.parent = args.parent;
    this.app = args.app;
    // Remove local state - use centralized app state
    this.emailBoardListCardMap = new EmailBoardListCardMap({
      parent: this,
      app: this.app,
    });
    // Initialize Trello API abstraction
    this.trel = new G2T.Trel({ app: this.app });
    this.initialized = false;
    // Board-load cascade tracker (Wave 2 Lane 3)
    this._boardLoadId = null;
    this._boardLoadPending = null;
  }

  init() {
    // State is loaded centrally by app
    this.bindEvents();
    this.initialized = true;
  }

  load() {
    // Check if we already have the data we need
    if (this.app.persist.trelloAuthorized && this.app.temp.boards?.length) {
      // Data already loaded, just emit ready event
      this.app.events.emit('trelloUserAndBoardsReady');
    } else {
      // Need to load data
      this.trelloLoad();
    }
  }

  trelloLoad() {
    this.app.utils.log('Loading Trello with API key:', this.app.trelloApiKey);
    // Use class_trel for API key management
    this.trel.setApiKey(this.app.trelloApiKey);
    this.checkTrelloAuthorized();
  }

  checkTrelloAuthorized_success(data) {
    this.app.persist.trelloAuthorized = true;

    // Log successful authorization
    this.app.utils.log('Trello authorization successful:', {
      user: data?.username || data?.fullName || 'Unknown user',
      id: data?.id,
      url: data?.url,
    });

    this.app.utils.log('Emitting checkTrelloAuthorized_success');
    this.app.events.emit('checkTrelloAuthorized_success', { data });
  }

  checkTrelloAuthorized_popup_failure(data) {
    this.app.persist.trelloAuthorized = false;
    this.app.events.emit('APIFail', { data });
  }

  checkTrelloAuthorized_failure(data) {
    this.app.utils.log(
      'Trello authorization with stored token failed, showing popup',
    );
    if (!Trello.authorized()) {
      // No valid token, show authorization popup
      this.app.events.emit('onBeforeAuthorize');
      Trello.authorize({
        type: 'popup',
        name: 'Gmail-2-Trello',
        interactive: true,
        persist: true,
        scope: { read: true, write: true },
        expiration: 'never',
        success: this.checkTrelloAuthorized_success.bind(this),
        error: this.checkTrelloAuthorized_popup_failure.bind(this),
      });
    } else {
      // We have a token but the API call failed - this shouldn't happen
      this.app.utils.log('Trello authorization failed with valid token');
      this.app.events.emit('APIFail', { data });
    }
  }

  checkTrelloAuthorized() {
    // First, try to authorize with stored token (non-interactive)
    Trello.authorize({
      interactive: false,
      success: this.checkTrelloAuthorized_success.bind(this),
      error: this.checkTrelloAuthorized_failure.bind(this),
    });
  }

  deauthorizeTrello() {
    this.app.persist.trelloAuthorized = false;
    this.app.persist.user = {};
    this.app.events.emit('deauthorizeTrello_success', {});
  }

  loadTrelloUser_success(data) {
    this.app.utils.log('loadTrelloUser_success called with data:', data);
    this.app.persist.user = data;
    this.app.utils.log('Emitting trelloUserReady');
    this.app.events.emit('trelloUserReady');
  }

  loadTrelloUser_failure(data) {
    this.app.events.emit('APIFail', { data });
  }

  loadTrelloUser() {
    if (!this.app.persist.trelloAuthorized) {
      return;
    }

    // Use class_trel for API call
    this.trel.getUser();
  }

  loadTrelloBoards_success(data) {
    this.app.utils.log('loadTrelloBoards_success called with data:', data);
    if (data) {
      this.app.temp.boards = data;
    }
    this.app.utils.log('Emitting trelloUserAndBoardsReady');
    this.app.events.emit('trelloUserAndBoardsReady');
  }

  loadTrelloBoards_failure(data) {
    this.app.events.emit('APIFail', { data });
  }

  loadTrelloBoards() {
    if (!this.app.persist.trelloAuthorized) {
      return;
    }

    // Use class_trel for API call
    this.trel.getBoards();
  }

  loadTrelloLists_success(data) {
    this.app.temp.lists = data;
    this.app.events.emit('loadTrelloLists_success', { data });
  }

  loadTrelloLists_failure(data) {
    this.app.events.emit('APIFail', { data });
  }

  loadTrelloLists(boardId) {
    if (!this.app.persist.trelloAuthorized) {
      return;
    }

    // Use class_trel for API call
    this.trel.getLists(boardId);
  }

  loadTrelloCards_success(data) {
    this.app.temp.cards = data;
    this.app.events.emit('loadTrelloCards_success', { data });
  }

  loadTrelloCards_failure(data) {
    this.app.events.emit('APIFail', { data });
  }

  loadTrelloCards(listId) {
    if (!this.app.persist.trelloAuthorized) {
      return;
    }
    // Defensive guard: never fire `GET lists//cards` (Trello rejects with
    // "invalid id" 400). Callers should be filtering, but belt-and-braces.
    if (!listId) {
      return;
    }

    // Use class_trel for API call
    this.trel.getCards(listId);
  }

  loadTrelloMembers_success(data) {
    this.app.temp.members = data;
    this.app.events.emit('loadTrelloMembers_success', { data });
  }

  loadTrelloMembers_failure(data) {
    this.app.events.emit('APIFail', { data });
  }

  loadTrelloMembers(boardId) {
    if (!this.app.persist.trelloAuthorized) {
      return;
    }

    // Use class_trel for API call
    this.trel.getMembers(boardId);
  }

  loadTrelloLabels_success(data) {
    this.app.temp.labels = data;
    this.app.events.emit('loadTrelloLabels_success', { data });
  }

  loadTrelloLabels_failure(data) {
    this.app.events.emit('APIFail', { data });
  }

  loadTrelloLabels(boardId) {
    if (!this.app.persist.trelloAuthorized) {
      return;
    }

    // Use class_trel for API call
    this.trel.getLabels(boardId);
  }

  submit(data) {
    if (!this.app.persist.trelloAuthorized) {
      this.app.events.emit('APIFail', { data });
      return;
    }

    if (!data || !data.boardId || !data.listId) {
      this.app.events.emit('invalidFormData', { data });
      return;
    }

    const uploader = new Uploader({
      parent: this,
      app: this.app,
      emailId: data.emailId,
      trel: this.trel,
    });
    uploader.init();
    uploader.submit(data);
  }

  emailBoardListCardMapLookup(key_value = {}) {
    return this.emailBoardListCardMap.lookup(key_value);
  }

  emailBoardListCardMapUpdate(key_value = {}) {
    return this.emailBoardListCardMap.update(key_value); // Changed from .add()
  }

  handleClassModelStateLoaded(event, params) {
    if (params) {
      // Only update specific state properties that were loaded
      if (params.trelloAuthorized !== undefined) {
        this.app.persist.trelloAuthorized = params.trelloAuthorized;
      }
      if (params.trelloData) {
        this.app.persist.trelloData = params.trelloData;
      }

      if (params.eblcmArray) {
        this.app.persist.eblcmArray = params.eblcmArray;
      }
    }
  }

  handleSubmittedFormShownComplete(target, params) {
    const data = params.data;

    if (!data) {
      this.app.events.emit('invalidFormData', { data });
      return;
    }

    this.submit(data);
  }

  handleNewCardUploadsComplete(target, params) {
    const { data } = params;

    // Update the email-board-list-card mapping
    if (data?.emailId && data?.boardId && data?.listId && data?.cardId) {
      this.emailBoardListCardMap.update({
        email: data.emailId,
        boardId: data.boardId,
        listId: data.listId,
        cardId: data.cardId,
      });
    }
  }

  // Form event handlers - moved from PopupView
  handleBoardChanged(target, params) {
    const boardId = params.boardId;
    if (boardId === '_' || boardId === '' || boardId === null) return;

    // Reset tracking for new board (Wave 2 Lane 3 cascade tracker)
    this._boardLoadId = boardId;
    this._boardLoadPending = new Set(['lists', 'labels', 'members']);

    this.loadTrelloLists(boardId);
    this.loadTrelloLabels(boardId);
    this.loadTrelloMembers(boardId);
  }

  _completeBoardLoadPart(part, boardId) {
    if (boardId !== this._boardLoadId) return;
    if (!this._boardLoadPending) return;

    this._boardLoadPending.delete(part);
    if (this._boardLoadPending.size === 0) {
      this._boardLoadPending = null;
      this.app.events.emit('boardDataReady', { boardId });
    }
  }

  handleListChanged(target, params) {
    const listId = params.listId;
    // Board change clears persist.listId to '' and fires listChanged via
    // the cascade. Skip the cards fetch in that case; otherwise Trello
    // returns "GET lists//cards invalid id" and the popup shows an error.
    if (!listId) {
      return;
    }
    this.loadTrelloCards(listId);
  }

  bindEvents() {
    this.app.events.addListener(
      'classModelStateLoaded',
      this.handleClassModelStateLoaded.bind(this),
    );
    this.app.events.addListener(
      'submittedFormShownComplete',
      this.handleSubmittedFormShownComplete.bind(this),
    );
    this.app.events.addListener(
      'newCardUploadsComplete',
      this.handleNewCardUploadsComplete.bind(this),
    );

    // Listen to board and list change events
    this.app.events.addListener(
      'boardChanged',
      this.handleBoardChanged.bind(this),
    );
    this.app.events.addListener(
      'listChanged',
      this.handleListChanged.bind(this),
    );

    // Listen to Trello user ready event to load boards
    this.app.events.addListener(
      'trelloUserReady',
      this.handleTrelloUserReady.bind(this),
    );

    // Listen to authorization success to start data loading
    this.app.events.addListener(
      'checkTrelloAuthorized_success',
      this.handleCheckTrelloAuthorized_success.bind(this),
    );

    // Wave 2 Lane 3: drive cascade tracker from Trel success events
    this.app.events.addListener(
      'loadTrelloLists_success',
      () => this._completeBoardLoadPart('lists', this._boardLoadId),
    );
    this.app.events.addListener(
      'loadTrelloLabels_success',
      () => this._completeBoardLoadPart('labels', this._boardLoadId),
    );
    this.app.events.addListener(
      'loadTrelloMembers_success',
      () => this._completeBoardLoadPart('members', this._boardLoadId),
    );
  }

  handleTrelloUserReady() {
    this.app.utils.log('handleTrelloUserReady called, loading boards');
    this.loadTrelloBoards();
  }

  handleCheckTrelloAuthorized_success() {
    // Load Trello data after successful authorization (don't show popup yet)
    this.app.utils.log(
      'handleCheckTrelloAuthorized_success called, loading user data',
    );
    this.loadTrelloUser();
  }
}

// Assign classes to namespace
G2T.Model = Model;
G2T.Model.EmailBoardListCardMap = EmailBoardListCardMap;

// End, class_model.js
