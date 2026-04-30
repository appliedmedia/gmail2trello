/** Gmail2Trello Application - ES6 Class Version
 */

var G2T = G2T || {}; // must be var to guarantee correct scope - do not alter this line

class App {
  static get ck() {
    // class keys here to assure they're treated like consts
    const ck = {
      id: 'g2t_app',
    };
    return ck;
  }

  get ck() {
    return App.ck;
  }

  constructor() {
    // Trello API key is not a secure key - it's meant to be public and is locked to this extension
    // This is the prescribed usage pattern for Trello API keys in client-side applications
    this.trelloApiKey = '21b411b1b5b549c54bd32f0e90738b41'; // Was: "c50413b23ee49ca49a5c75ccf32d0459"
    this.goog = new G2T.Goog({ app: this });
    this.events = new G2T.EventTarget({ app: this });
    this.gmail = new G2T.Gmail({ app: this });
    this.model = new G2T.Model({ app: this });
    this.gmailView = new G2T.GmailView({ app: this });
    this.popupView = new G2T.PopupView({ app: this });
    this.utils = new G2T.Utils({ app: this });

    // Persistent state management
    this.persist = {
      // Gmail layout state
      layoutMode: 0, // LAYOUT_DEFAULT
      // Model state
      trelloAuthorized: false,
      // Trello data (flattened)
      user: null,
      eblcmArray: [],
      // PopupView state
      popupWidth: 700,
      popupHeight: 464,
      // Utils state
      storageHashes: {},
      // Form state (persisted)
      boardId: null,
      listId: null,
      cardId: null,
      useBackLink: true,
      addCC: false,
      markdown: true,
      // User preferences (persisted)
      labelsId: '',
      membersId: '',
    };

    // Temporary state (not saved to storage)
    this.temp = {
      log: {
        memory: [],
        count: 0,
        max: 100,
        debugMode: false,
      },
      updatesPending: [],
      comboInitialized: false,
      pendingMessage: null,
      // Personal data (not persisted)
      description: '',
      title: '',
      attachment: [],
      image: [],
      // Trello data (not persisted - reloaded from API)
      boards: [],
      lists: [],
      cards: [],
      members: [],
      labels: [],
    };

    // App initialization flag (local, not persisted)
    this.initialized = false;
  }

  persistLoad() {
    this.utils.loadFromChromeStorage(this.ck.id, 'classAppStateLoaded');
  }

  persistSave() {
    this.utils.saveToChromeStorage(this.ck.id, this.persist);
  }

  updateData() {
    const fullName = this?.model?.trello?.user?.fullName || '';

    this.popupView.bindData(this.model);

    this.gmailView.parsingData = false;
    this.model.gmail = this.gmailView.parseData({ fullName });
    this.popupView.bindGmailData(this.model.gmail);
  }

  // Event handlers
  handleClassAppStateLoaded(event, params = {}) {
    // Merge loaded data into persist state
    Object.assign(this.persist, params);

    this.initialized = true;

    if (this.popupView?.handlePersistLoaded) {
      this.popupView.handlePersistLoaded();
    }
  }

  // Event binding
  bindEvents() {
    this.events.addListener(
      'classAppStateLoaded',
      this.handleClassAppStateLoaded.bind(this),
    );
  }

  init() {
    // this.utils.log('App:initialize');
    this.bindEvents();
    this.model.init();
    this.gmailView.init();
    this.popupView.init();
    this.utils.init();
    // gmail.init() must run AFTER gmailView/popupView have bound their
    // 'gmailReady'/'gmailLoaded' listeners. gmail.init() synchronously
    // requests a replay of the cached bootstrap events from
    // gmail_loader.js (MAIN world); if the replay arrives before the
    // view listeners are wired, the bootstrap signal is lost and the
    // toolbar button is never injected.
    this.gmail.init();
    this.persistLoad();
  }
}

// Assign class to namespace
G2T.App = App;

// End, class_app.js
