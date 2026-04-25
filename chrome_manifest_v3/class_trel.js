var G2T = G2T || {}; // must be var to guarantee correct scope - do not alter this line

class Trel {
  static get ck() {
    // class keys here to assure they're treated like consts
    const ck = {
      id: 'g2t_trel',
      errorPrefix: 'Trello API Error:',
      unauthorizedError: 'Trello not authorized',
      apiCallPrefix: 'Trello API call:',
    };
    return ck;
  }

  get ck() {
    return Trel.ck;
  }

  constructor({ app } = {}) {
    this.app = app;
    this._requestVersions = { lists: 0, cards: 0, labels: 0, members: 0 };
    this.bindEvents();
  }

  bindEvents() {
    // No specific events to bind for Trello API
    // Events will be handled through the app's event system
  }

  /**
   * Increments and returns the version counter for a fetch category.
   * Used to discard stale API responses when rapid user actions cause
   * overlapping requests for the same category (lists/cards/labels/members).
   * @param {string} category - One of 'lists', 'cards', 'labels', 'members'
   * @returns {number} The new current version for the category
   */
  _nextVersion(category) {
    return ++this._requestVersions[category];
  }

  /**
   * Returns true iff the given version is still the current version for the
   * category, i.e. no newer same-category request has been issued since.
   * @param {string} category - One of 'lists', 'cards', 'labels', 'members'
   * @param {number} version - Version captured when the request was issued
   * @returns {boolean}
   */
  _isCurrentVersion(category, version) {
    return this._requestVersions[category] === version;
  }

  /**
   * Sets the Trello API key for authentication
   * @param {string} apiKey - The Trello API key
   */
  setApiKey(apiKey) {
    if (!apiKey) {
      this.app.utils.log(`${this.ck.errorPrefix} No API key provided`);
      return false;
    }

    try {
      Trello.setKey(apiKey);
      this.app.utils.log(`${this.ck.apiCallPrefix} API key set successfully`);
      return true;
    } catch (error) {
      this.app.utils.log(
        `${this.ck.errorPrefix} Failed to set API key: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Gets the current Trello API key from the app
   * @returns {string} The API key or null if not available
   */
  getApiKey() {
    return this.app?.trelloApiKey || null;
  }

  /**
   * Checks if Trello is currently authorized
   * @returns {boolean} True if authorized, false otherwise
   */
  isAuthorized() {
    return this.app?.persist?.trelloAuthorized || false;
  }

  /**
   * Wraps Trello API calls with authorization check, logging, and error handling
   * @param {string} method - HTTP method (get, post, put, delete)
   * @param {string} path - API endpoint path
   * @param {object} params - Parameters for the API call
   * @param {Function} successCallback - Success callback function
   * @param {Function} failureCallback - Failure callback function
   */
  wrapApiCall(method, path, params, successCallback, failureCallback) {
    // Check authorization first
    if (!this.isAuthorized()) {
      this.app.utils.log(`${this.ck.errorPrefix} ${this.ck.unauthorizedError}`);
      if (failureCallback) {
        failureCallback({ error: this.ck.unauthorizedError });
      }
      return;
    }

    // Log the API call
    this.app.utils.log(
      `${this.ck.apiCallPrefix} ${method.toUpperCase()} ${path}`,
    );

    try {
      // Make the Trello API call
      Trello.rest(
        method,
        path,
        params,
        data => {
          this.app.utils.log(
            `${
              this.ck.apiCallPrefix
            } ${method.toUpperCase()} ${path} - Success`,
          );
          if (successCallback) {
            successCallback(data);
          }
        },
        error => {
          this.app.utils.log(
            `${
              this.ck.errorPrefix
            } ${method.toUpperCase()} ${path} - Failed: ${JSON.stringify(
              error,
            )}`,
          );
          if (failureCallback) {
            failureCallback(error);
          }
        },
      );
    } catch (error) {
      this.app.utils.log(
        `${this.ck.errorPrefix} ${method.toUpperCase()} ${path} - Exception: ${
          error.message
        }`,
      );
      if (failureCallback) {
        failureCallback({ error: error.message });
      }
    }
  }

  /**
   * Initiates Trello authorization flow
   * @param {boolean} interactive - Whether to show interactive popup (default: false)
   */
  authorize(interactive = false) {
    this.app.utils.log(
      `${this.ck.apiCallPrefix} Starting authorization flow (interactive: ${interactive})`,
    );

    try {
      Trello.authorize(
        {
          type: 'popup',
          name: 'Gmail-2-Trello',
          scope: {
            read: true,
            write: true,
          },
          expiration: 'never',
          return_url: window.location.href,
        },
        this.authorize_success.bind(this),
        this.authorize_failure.bind(this),
      );
    } catch (error) {
      this.app.utils.log(
        `${this.ck.errorPrefix} Authorization failed: ${error.message}`,
      );
      this.authorize_failure({ error: error.message });
    }
  }

  /**
   * Deauthorizes Trello by clearing the token
   */
  deauthorize() {
    this.app.utils.log(`${this.ck.apiCallPrefix} Deauthorizing Trello`);

    // Always update the authorization state, even if Trello.deauthorize() fails
    this.app.persist.trelloAuthorized = false;
    this.app.persist.trelloData = null;

    try {
      Trello.deauthorize();
      this.app.utils.log(`${this.ck.apiCallPrefix} Deauthorization successful`);
    } catch (error) {
      this.app.utils.log(
        `${this.ck.errorPrefix} Deauthorization failed: ${error.message}`,
      );
    }
  }

  /**
   * Handles successful Trello authorization
   * @param {object} data - Authorization response data
   */
  authorize_success(data) {
    this.app.utils.log(`${this.ck.apiCallPrefix} Authorization successful`);
    this.app.persist.trelloAuthorized = true;
    this.app.persist.trelloData = data;
    this.app.events.emit('trelloAuthorized', { data });
  }

  /**
   * Handles failed Trello authorization
   * @param {object} error - Authorization error data
   */
  authorize_failure(error) {
    this.app.utils.log(
      `${this.ck.errorPrefix} Authorization failed: ${JSON.stringify(error)}`,
    );
    this.app.persist.trelloAuthorized = false;
    this.app.persist.trelloData = null;
    this.app.events.emit('trelloAuthorizationFailed', { error });
  }

  /**
   * Handles popup failure during authorization
   * @param {object} error - Popup error data
   */
  authorize_popup_failure(error) {
    this.app.utils.log(
      `${this.ck.errorPrefix} Authorization popup failed: ${JSON.stringify(
        error,
      )}`,
    );
    this.app.persist.trelloAuthorized = false;
    this.app.persist.trelloData = null;
    this.app.events.emit('trelloAuthorizationPopupFailed', { error });
  }

  /**
   * Gets current Trello user data
   */
  getUser() {
    this.wrapApiCall(
      'get',
      'members/me',
      {},
      this.getUser_success.bind(this),
      this.getUser_failure.bind(this),
    );
  }

  /**
   * Handles successful user data retrieval
   * @param {object} data - User data from Trello API
   */
  getUser_success(data) {
    this.app.utils.log(
      `${this.ck.apiCallPrefix} User data retrieved successfully`,
    );
    this.app.persist.user = data;
    // Emit the event that Model expects
    this.app.events.emit('trelloUserReady');
  }

  /**
   * Handles failed user data retrieval
   * @param {object} error - Error data from Trello API
   */
  getUser_failure(error) {
    this.app.utils.log(
      `${this.ck.errorPrefix} Failed to get user data: ${JSON.stringify(
        error,
      )}`,
    );
    this.app.events.emit('APIFail', { data: error });
  }

  /**
   * Gets user's Trello boards
   */
  getBoards() {
    this.wrapApiCall(
      'get',
      'members/me/boards',
      {},
      this.getBoards_success.bind(this),
      this.getBoards_failure.bind(this),
    );
  }

  /**
   * Handles successful boards data retrieval
   * @param {object} data - Boards data from Trello API
   */
  getBoards_success(data) {
    this.app.utils.log(
      `${this.ck.apiCallPrefix} Boards data retrieved successfully`,
    );
    if (data) {
      this.app.temp.boards = data;
    }
    // Emit the event that Model expects
    this.app.events.emit('trelloUserAndBoardsReady');
  }

  /**
   * Handles failed boards data retrieval
   * @param {object} error - Error data from Trello API
   */
  getBoards_failure(error) {
    this.app.utils.log(
      `${this.ck.errorPrefix} Failed to get boards data: ${JSON.stringify(
        error,
      )}`,
    );
    this.app.events.emit('APIFail', { data: error });
  }

  /**
   * Gets lists for a specific board
   * @param {string} boardId - The board ID
   */
  getLists(boardId) {
    const version = this._nextVersion('lists');
    this.wrapApiCall(
      'get',
      `boards/${boardId}/lists`,
      {},
      (data) => this.getLists_success(data, version),
      this.getLists_failure.bind(this),
    );
  }

  /**
   * Handles successful lists data retrieval
   * @param {object} data - Lists data from Trello API
   * @param {number} [version] - Captured version; response is discarded if stale
   */
  getLists_success(data, version) {
    if (version !== undefined && !this._isCurrentVersion('lists', version)) {
      this.app.utils.log(
        `${this.ck.apiCallPrefix} Discarding stale lists response`,
      );
      return;
    }
    this.app.utils.log(
      `${this.ck.apiCallPrefix} Lists data retrieved successfully`,
    );
    this.app.temp.lists = data;
    this.app.events.emit('loadTrelloLists_success', { data });
  }

  /**
   * Handles failed lists data retrieval
   * @param {object} error - Error data from Trello API
   */
  getLists_failure(error) {
    this.app.utils.log(
      `${this.ck.errorPrefix} Failed to get lists data: ${JSON.stringify(
        error,
      )}`,
    );
    this.app.events.emit('APIFail', { data: error });
  }

  /**
   * Gets cards for a specific list
   * @param {string} listId - The list ID
   */
  getCards(listId) {
    const version = this._nextVersion('cards');
    this.wrapApiCall(
      'get',
      `lists/${listId}/cards`,
      {},
      (data) => this.getCards_success(data, version),
      this.getCards_failure.bind(this),
    );
  }

  /**
   * Handles successful cards data retrieval
   * @param {object} data - Cards data from Trello API
   * @param {number} [version] - Captured version; response is discarded if stale
   */
  getCards_success(data, version) {
    if (version !== undefined && !this._isCurrentVersion('cards', version)) {
      this.app.utils.log(
        `${this.ck.apiCallPrefix} Discarding stale cards response`,
      );
      return;
    }
    this.app.utils.log(
      `${this.ck.apiCallPrefix} Cards data retrieved successfully`,
    );
    this.app.temp.cards = data;
    this.app.events.emit('loadTrelloCards_success', { data });
  }

  /**
   * Handles failed cards data retrieval
   * @param {object} error - Error data from Trello API
   */
  getCards_failure(error) {
    this.app.utils.log(
      `${this.ck.errorPrefix} Failed to get cards data: ${JSON.stringify(
        error,
      )}`,
    );
    this.app.events.emit('APIFail', { data: error });
  }

  /**
   * Gets members for a specific board
   * @param {string} boardId - The board ID
   */
  getMembers(boardId) {
    const version = this._nextVersion('members');
    this.wrapApiCall(
      'get',
      `boards/${boardId}/members`,
      {},
      (data) => this.getMembers_success(data, version),
      this.getMembers_failure.bind(this),
    );
  }

  /**
   * Handles successful members data retrieval
   * @param {object} data - Members data from Trello API
   * @param {number} [version] - Captured version; response is discarded if stale
   */
  getMembers_success(data, version) {
    if (version !== undefined && !this._isCurrentVersion('members', version)) {
      this.app.utils.log(
        `${this.ck.apiCallPrefix} Discarding stale members response`,
      );
      return;
    }
    this.app.utils.log(
      `${this.ck.apiCallPrefix} Members data retrieved successfully`,
    );
    this.app.temp.members = data;
    this.app.events.emit('loadTrelloMembers_success', { data });
  }

  /**
   * Handles failed members data retrieval
   * @param {object} error - Error data from Trello API
   */
  getMembers_failure(error) {
    this.app.utils.log(
      `${this.ck.errorPrefix} Failed to get members data: ${JSON.stringify(
        error,
      )}`,
    );
    this.app.events.emit('APIFail', { data: error });
  }

  /**
   * Gets labels for a specific board
   * @param {string} boardId - The board ID
   */
  getLabels(boardId) {
    const version = this._nextVersion('labels');
    this.wrapApiCall(
      'get',
      `boards/${boardId}/labels`,
      {},
      (data) => this.getLabels_success(data, version),
      this.getLabels_failure.bind(this),
    );
  }

  /**
   * Handles successful labels data retrieval
   * @param {object} data - Labels data from Trello API
   * @param {number} [version] - Captured version; response is discarded if stale
   */
  getLabels_success(data, version) {
    if (version !== undefined && !this._isCurrentVersion('labels', version)) {
      this.app.utils.log(
        `${this.ck.apiCallPrefix} Discarding stale labels response`,
      );
      return;
    }
    this.app.utils.log(
      `${this.ck.apiCallPrefix} Labels data retrieved successfully`,
    );
    this.app.temp.labels = data;
    this.app.events.emit('loadTrelloLabels_success', { data });
  }

  /**
   * Handles failed labels data retrieval
   * @param {object} error - Error data from Trello API
   */
  getLabels_failure(error) {
    this.app.utils.log(
      `${this.ck.errorPrefix} Failed to get labels data: ${JSON.stringify(
        error,
      )}`,
    );
    this.app.events.emit('APIFail', { data: error });
  }

  /**
   * Creates a new Trello card
   * @param {object} cardData - Card data including name, desc, idList, idBoard, etc.
   */
  createCard(cardData) {
    // Handle null or undefined cardData
    if (!cardData) {
      this.app.events.emit('invalidFormData', { data: cardData });
      return;
    }

    // Determine card position from cardPos or position field
    // cardPos is the Trello card position value (e.g., "top", "bottom", numeric position)
    // position indicates whether to add to top or bottom (e.g., "above", "below")
    let pos = 'top'; // default

    if (cardData.cardPos) {
      // If cardPos is provided, use it directly (for updating existing card's position)
      pos = cardData.cardPos;
    } else if (cardData.position) {
      // If position is provided, map it to Trello position
      // "above" or "top" -> "top"
      // "below" or "bottom" -> "bottom"
      const positionLower = String(cardData.position).toLowerCase();
      if (
        positionLower === 'below' ||
        positionLower === 'bottom' ||
        positionLower === 'down'
      ) {
        pos = 'bottom';
      } else {
        pos = 'top';
      }
    }

    const data = {
      name: cardData.title || cardData.subject || 'No Subject',
      desc: cardData.description || cardData.body || '',
      idList: cardData.listId,
      idBoard: cardData.boardId,
      pos: pos,
    };

    if (cardData.labels && cardData.labels.length > 0) {
      data.idLabels = cardData.labels;
    }

    if (cardData.members && cardData.members.length > 0) {
      data.idMembers = cardData.members;
    }

    if (cardData.dueDate) {
      data.due = cardData.dueDate;
    }

    // Validate required Trello API fields
    if (!data.idList || !data.idBoard) {
      this.app.utils.log(
        `${this.ck.errorPrefix} Missing required fields - listId: ${data.idList}, boardId: ${data.idBoard}`,
      );
      this.app.events.emit('invalidFormData', { data: cardData });
      return;
    }

    this.wrapApiCall(
      'post',
      'cards',
      data,
      this.createCard_success.bind(this, cardData),
      this.createCard_failure.bind(this),
    );
  }

  /**
   * Handles successful card creation
   * @param {object} originalData - Original card data passed to createCard
   * @param {object} response - Response data from Trello API
   */
  createCard_success(originalData, response) {
    this.app.utils.log(`${this.ck.apiCallPrefix} Card created successfully`);
    const cardId = response.id;

    // Emit the event that Model expects
    this.app.events.emit('createCard_success', {
      data: { ...originalData, cardId },
    });
  }

  /**
   * Handles failed card creation
   * @param {object} error - Error data from Trello API
   */
  createCard_failure(error) {
    this.app.utils.log(
      `${this.ck.errorPrefix} Failed to create card: ${JSON.stringify(error)}`,
    );
    this.app.events.emit('createCard_failed', { data: error });
  }
}

// Assign class to namespace
G2T.Trel = Trel;
