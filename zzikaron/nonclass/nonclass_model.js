var Gmail2Trello = Gmail2Trello || {}; // must be var to guarantee correct scope

Gmail2Trello.Model = function (parent) {
  this.trello = {
    apiKey: '21b411b1b5b549c54bd32f0e90738b41', // Was: "c50413b23ee49ca49a5c75ccf32d0459"
    user: null,
    boards: null,
  };
  this.parent = parent;
  this.settings = {};
  this.isInitialized = false;
  this.event = new EventTarget();
  this.newCard = null;
};

Gmail2Trello.Model.prototype.init = function () {
  const eblcMapID = Gmail2Trello.Model.prototype.EmailBoardListCardMap.id;

  this[eblcMapID] = new this.EmailBoardListCardMap({
    parent: this,
  });

  this.isInitialized = true;

  // init Trello
  this.initTrello();
};

Gmail2Trello.Model.prototype.initTrello = function () {
  // g2t_log("Model:initTrello");

  let self = this;

  self.trello.user = null;
  self.trello.boards = null;

  Trello.setKey(self.trello.apiKey);
  self.checkTrelloAuthorized();
};

Gmail2Trello.Model.prototype.checkTrelloAuthorized = function () {
  // g2t_log("checkTrelloAuthorized");

  let self = this;

  // Assures there's a token or not:
  Trello.authorize({
    interactive: false,
    success: function (data) {
      self.event.fire('onAuthorized');
      self.loadTrelloData();
    },
    error: function (data) {
      if (!Trello.authorized()) {
        // Assure token is invalid
        self.event.fire('onBeforeAuthorize');
        Trello.authorize({
          type: 'popup',
          name: 'Gmail-2-Trello',
          interactive: true,
          persit: true,
          scope: { read: true, write: true },
          expiration: 'never',
          success: function (data) {
            g2t_log('checkTrelloAuthorized: Trello authorization successful');
            // g2t_log(data);
            self.event.fire('onAuthorized');
            self.loadTrelloData();
          },
          error: function (data) {
            self.event.fire('onAuthorizeFail');
          },
        });
      } else {
        g2t_log('Model:checkTrelloAuthorized: failed');
        // We have a valid token, so...how did we get here?
        // self.event.fire('onAuthorized');
        // self.loadTrelloData();
        // g2t_log(Trello);
        // g2t_log(Trello.token());
      }
    },
  });
};

Gmail2Trello.Model.prototype.deauthorizeTrello = function () {
  g2t_log('deauthorizeTrello');

  Trello.deauthorize();
  this.isInitialized = false;
};

// NOTE (Ace@2020-04-03): 403s: "https://trello-avatars.s3.amazonaws.com/" + avatarHash + "/30.png";
// Gravatar requires md5 hash of lowercase email address [see "https://www.gravatar.com/site/implement/images/"]:
// "https://www.gravatar.com/avatar/" + gravatarHash + ".jpg?s=30";
// avatarUrl return format is "https://trello-members.s3.amazonaws.com/{member-id}/{member-avatar-hash}/30.png"
Gmail2Trello.Model.prototype.makeAvatarUrl = function (args) {
  let retn = '';
  if (args?.avatarUrl?.length > 8) {
    retn = `${args.avatarUrl}/30.png`;
  }
  return retn;
};

Gmail2Trello.Model.prototype.loadTrelloData = function () {
  // g2t_log('loadTrelloData');

  this.event.fire('onBeforeLoadTrello');
  this.trello.user = null;

  let self = this;

  // get user's info
  // g2t_log('loadTrelloData: User info');
  Trello.get(
    'members/me',
    {},
    function (data) {
      if (!data?.id) {
        return false;
      }

      self.trello.user = data;

      // g2t_log('loadTrelloData: User boards');
      self.trello.boards = null;
      Trello.get(
        'members/me/boards',
        {
          organization: 'true',
          organization_fields: 'displayName',
          filter: 'open',
          fields: 'name' /* "name,closed" */,
        },
        function (data) {
          let validData = Array();
          for (let i = 0; i < data.length; i++) {
            // if (data[i].idOrganization === null)
            //   data[i].idOrganization = '-1';

            // Only accept opening boards
            if (i == 0) {
              // g2t_log(JSON.stringify(data[i]));
            }
            if (data[i].closed != true) {
              validData.push(data[i]);
            }
          }
          // g2t_log('loadTrelloData: Boards data');
          // g2t_log(JSON.stringify(data));
          // g2t_log(JSON.stringify(validData));
          self.trello.boards = validData;
          self.checkTrelloDataReady();
        },
        function failure(data) {
          self.event.fire('onAPIFailure', { data: data });
        }
      );
      self.checkTrelloDataReady();
    },
    function failure(data) {
      self.event.fire('onAPIFailure', { data: data });
    }
  );
};

Gmail2Trello.Model.prototype.checkTrelloDataReady = function () {
  if (this.trello.user !== null && this.trello.boards !== null) {
    // yeah! the data is ready
    //g2t_log('checkTrelloDataReady: YES');
    //g2t_log(this);
    this.event.fire('onTrelloDataReady');
  }
  //else g2t_log('checkTrelloDataReady: NO');
};

Gmail2Trello.Model.prototype.loadTrelloLists = function (boardId) {
  // g2t_log('loadTrelloLists');

  let self = this;
  this.trello.lists = null;

  Trello.get(
    `boards/${boardId}`,
    { lists: 'open', list_fields: 'name' },
    function (data) {
      self.trello.lists = data.lists;
      // g2t_log('loadTrelloLists: lists:' + JSON.stringify(self.trello.lists));
      self.event.fire('onLoadTrelloListSuccess');
    },
    function failure(data) {
      self.event.fire('onAPIFailure', { data: data });
    }
  );
};

Gmail2Trello.Model.prototype.loadTrelloCards = function (listId) {
  // g2t_log('loadTrelloCards');

  let self = this;
  this.trello.cards = null;

  Trello.get(
    `lists/${listId}/cards`,
    { fields: 'name,pos,idMembers,idLabels' },
    function (data) {
      self.trello.cards = data;
      // g2t_log('loadTrelloCards: cards:' + JSON.stringify(self.trello.cards));
      self.event.fire('onLoadTrelloCardsSuccess');
    },
    function failure(data) {
      self.event.fire('onAPIFailure', { data: data });
    }
  );
};

Gmail2Trello.Model.prototype.loadTrelloLabels = function (boardId) {
  // g2t_log('loadTrelloLabels');

  let self = this;
  this.trello.labels = null;

  Trello.get(
    `boards/${boardId}/labels`,
    { fields: 'color,name' },
    function (data) {
      self.trello.labels = data;
      // g2t_log('loadTrelloLabels: labels:' + JSON.stringify(self.trello.labels));
      self.event.fire('onLoadTrelloLabelsSuccess');
    },
    function failure(data) {
      self.event.fire('onAPIFailure', { data: data });
    }
  );
};

Gmail2Trello.Model.prototype.loadTrelloMembers = function (boardId) {
  // g2t_log('loadTrelloMembers');

  let self = this;
  this.trello.members = null;

  Trello.get(
    `boards/${boardId}/members`,
    { fields: 'id,fullName,username,initials,avatarUrl' },
    function (data) {
      const me = self.trello.user;
      // Remove this user from the members list:
      self.trello.members = data
        .map(function (item, iter) {
          return item.id !== me.id ? item : null;
        })
        .filter(function (item) {
          return item !== null;
        });
      // And shove this user in the first position:
      self.trello.members.unshift({
        id: me.id,
        username: me.username,
        initials: me.initials,
        avatarUrl: me.avatarUrl, // avatarHash: me.avatarHash,
        fullName: me.fullName,
      });

      // g2t_log('loadTrelloMembers: members:' + JSON.stringify(self.trello.members));

      self.event.fire('onLoadTrelloMembersSuccess');
    },
    function failure(data) {
      self.event.fire('onAPIFailure', { data: data });
    }
  );
};

Gmail2Trello.Model.prototype.Uploader = function (args) {
  if (!args?.parent) {
    return;
  }

  Object.assign(this, args);

  this.data = [];

  this.pos = this.translatePosition({
    position: args.position || '',
    cardPos: args.cardPos || '',
  });

  if (this.pos !== 'at') {
    this.data.push({ property: 'cards' }); // Seed array for new card
  }
};

Gmail2Trello.Model.prototype.Uploader.prototype = {
  attachments: 'attachments',

  exclude: function (list, exclude) {
    let list_new = [];
    g2t_each(list.split(','), function (item) {
      if (exclude.indexOf(item) === -1) {
        list_new.push(item);
      }
    });
    return list_new.join(',');
  },

  add: function (args) {
    if (args && Object.keys(args).every(key => {
      const val = args[key];
      return val != null && (
        typeof val === "number" ||
        typeof val === "boolean" ||
        val.length > 0
      );
    })) {
      if (this.pos !== 'at' && args.property !== this.attachments) {
        // It's a new card so add to the existing hash:
        this.data[0][args.property] = args.value;
      } else {
        const cardId_k = this.pos === 'at' ? this.cardId : '%cardId%'; // Won't know until we store the initial card
        args.property = `cards/${cardId_k}/${args.property}`;
        this.data.push(args);
      }
    }
    return this;
  },

  translatePosition: function (args) {
    let pos = 'bottom';

    if (!this.cardId || this.cardId.length < 1 || this.cardId === '-1') {
      pos = 'top';
    } else {
      const position_k = args.position || 'below';
      const cardPos_k = parseInt(args.cardPos || 0, 10);

      switch (position_k) {
        case 'below':
          if (cardPos_k) {
            pos = cardPos_k + 1;
          } else {
            // pos = 'bottom';
          }
          break;
        case 'to':
          pos = 'at';
          break;
        default:
          g2t_log(
            'submit: ERROR: Got unknown case: ' +
              (position_k || '<empty position>')
          );
      }
    }
    return pos;
  },

  process_response: function (data_in) {
    const url_k = data_in?.url || '';
    const id_k = data_in?.id || '';
    const card_k = data_in?.data?.card || {};

    let shortLink = card_k?.shortLink || '';
    if (shortLink.length > 0) {
      shortLink = `https://trello.com/c/${shortLink}`;
    }

    const add_id_k = card_k?.id || 0;
    const add_title_k = card_k?.name || '';

    const new_url_k = shortLink || url_k || '';
    const new_id_k = add_id_k || id_k || '';

    if (new_url_k && this.parent.newCard?.url === undefined) {
      this.parent.newCard.url = new_url_k;
    }
    if (new_id_k && this.parent.newCard?.id === undefined) {
      this.parent.newCard.id = new_id_k;
      this.cardId = new_id_k;
    }
    if (add_title_k?.length > 0) {
      this.parent.newCard.title = add_title_k;
    }
  },

  attach: function (method, property, upload1, success, failure) {
    const self = this;

    if (
      !property ||
      property.length < 6 ||
      !upload1 ||
      !upload1.value ||
      upload1.value.length < 6
    )
      return;

    const UPLOAD_ATTACH = 'g2t_upload_attach';
    const UPLOAD_ATTACH_RESULTS = 'g2t_upload_attach_results';
    const trello_url_k = 'https://api.trello.com/1/';
    const param_k = upload1.value;

    // NOTE (Ace, 2020-02-15): We have a funny problem with embedded images so breaking this up:
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

    try {
      chrome.runtime.sendMessage(dict, callback);
    } catch (error) {
      g2t_log(
        `sendMessage ERROR: extension context invalidated - failed "chrome.runtime.sendMessage"`
      );
      self?.parent?.popupView?.displayExtensionInvalidReload();
    }
  },

  upload: function () {
    const self = this;
    const generateKeysAndValues = function (object) {
      let keysAndValues = [];
      g2t_each(object, function (value, key) {
        keysAndValues.push(
          `${key}=${value || ''} (${(value || '').toString().length})`
        );
      });
      return keysAndValues.sort().join(' ');
    };
    let upload1 = self.data.shift();
    if (!upload1) {
      self.parent.event.fire('onCardSubmitComplete', {
        data: { emailId: self.emailId },
      });
    } else {
      const dict_k = { cardId: this.cardId || '' };

      let method = upload1.method || 'post';
      let property = this.parent.parent.replacer(upload1.property, dict_k);
      upload1.method = undefined;
      upload1.property = undefined;

      const fn_k = property.endsWith(self.attachments)
        ? self.attach
        : Trello.rest;

      fn_k(
        method,
        property,
        upload1,
        function success(data) {
          Object.assign(data, {
            method: `${method} ${property}`,
            keys: generateKeysAndValues(upload1),
            emailId: self.emailId,
          });
          self.process_response(data);
          if (self.data?.length > 0) {
            self.upload();
          } else {
            self.parent.event.fire('onCardSubmitComplete', {
              data: data,
            });
          }
        },
        function failure(data) {
          Object.assign(data, {
            method: `${method} ${property}`,
            keys: generateKeysAndValues(upload1),
            emailId: self.emailId,
          });
          self.parent.event.fire('onAPIFailure', { data: data });
        }
      );
    }
  },
};

Gmail2Trello.Model.prototype.submit = function () {
  let self = this;
  if (self.newCard === null) {
    g2t_log('submit: data is empty');
    return false;
  }

  self.parent.saveSettings();

  let data = self.newCard;

  let text = data.title || '';
  if (text.length > 0) {
    if (data.markdown) {
      text = `**${text}**\n\n`;
    }
  }
  text += data.description;

  text = self.parent.truncate(text, self.parent.popupView.MAX_BODY_SIZE, '...');

  let desc = self.parent.truncate(
    data.description,
    self.parent.popupView.MAX_BODY_SIZE,
    '...'
  );

  let due_text = '';

  if (data.dueDate?.length > 1) {
    // Will 400 if not valid date:
    /* Workaround for quirk in Date object,
     * See: http://stackoverflow.com/questions/28234572/html5-datetime-local-chrome-how-to-input-datetime-in-current-time-zone
     * Was: dueDate.replace('T', ' ').replace('-','/')
     */
    let due = data.dueDate.replace('-', '/');

    if (data.dueTime?.length > 1) {
      due += ` ${data.dueTime}`;
    } else {
      due += ' 00:00'; // Must provide time
    }
    due_text = new Date(due).toISOString();
    /* (NOTE (Ace, 27-Feb-2017): When we used datetime-local object, this was:
        trelloPostableData.due = (new Date(data.dueDate.replace('T', ' ').replace('-','/'))).toISOString();
        */
  }

  let uploader = new this.Uploader({
    parent: self,
    cardId: data.cardId,
    position: data.position,
    cardPos: data.cardPos,
    emailId: data.emailId,
  });

  const pos_k = uploader.pos;

  if (pos_k === 'at') {
    uploader.add({ property: 'actions/comments', text: text });
  } else {
    uploader
      .add({ property: 'pos', value: pos_k })
      .add({ property: 'name', value: data.title })
      .add({ property: 'desc', value: desc })
      .add({ property: 'idList', value: data.listId });
  }

  uploader
    .add({
      property: 'idMembers',
      value: uploader.exclude(data.membersId, data.cardMembers),
    })
    .add({
      property: 'idLabels',
      value: uploader.exclude(data.labelsId, data.cardLabels),
    })
    .add({ property: 'due', value: due_text, method: 'put' });

  let imagesAndAttachments = (data.images || []).concat(data.attachments || []);

  g2t_each(imagesAndAttachments, function (item) {
    if (item?.checked && item.url?.length > 5) {
      uploader.add({
        property: uploader.attachments,
        value: item.url,
        name: item.name,
      });
    }
  });

  uploader.upload();
};

Gmail2Trello.Model.prototype.emailBoardListCardMapLookup = function (
  key_value = {}
) {
  const obj = this;
  const fn = 'lookup';
  const retn_k = Gmail2Trello.Model.prototype.EmailBoardListCardMap.call_in({
    obj,
    fn,
    key_value,
  });
  return retn_k;
};
Gmail2Trello.Model.prototype.emailBoardListCardMapUpdate = function (
  key_value = {}
) {
  const obj = this;
  const fn = 'add';
  const retn_k = Gmail2Trello.Model.prototype.EmailBoardListCardMap.call_in({
    obj,
    fn,
    key_value,
  });
};
Gmail2Trello.Model.prototype.EmailBoardListCardMap = class {
  constructor(args) {
    this.list = [];
    this.parent = this;
    if (args?.parent) {
      this.parent = args.parent;
    }
    this.chrome_restore();
  }

  static get id() {
    return 'g2t_emailBoardListCardMap';
  }
  get id() {
    return Gmail2Trello.Model.prototype.EmailBoardListCardMap.id;
  }

  static call_in(args) {
    const eblcMapID = this.id || 0;
    const retn_k = args?.obj?.[eblcMapID]?.[args.fn]?.(args.key_value) || {};
    return retn_k;
  }

  add(args = {}) {
    if (
      ['emailId', 'boardId', 'listId', 'cardId'].every(field => {
        const val = args?.[field];
        return val != null && (
          typeof val === "number" ||
          typeof val === "boolean" ||
          val.length > 0
        );
      })
    ) {
      // args.timestamp = Date.now(); // NOTE (acoven@2020-05-23): Turn on for circular file
      const emailId = args.emailId;
      const index_k = this.find({ emailId });
      this.makeRoom(index_k);
      this.push(args);
      this.chrome_save();
    }
    return this;
  }

  chrome_restore() {
    const self = this;
    const id_k = self.id;
    try {
      chrome.storage.sync.get(id_k, function (response) {
        if (response?.[id_k]) {
          try {
            self.list = JSON.parse(response[id_k]);
          } catch (err) {
            g2t_log(
              `chrome_restore: JSON parse failed! Error: ${JSON.stringify(err)}`
            );
          }
        }
      });
    } catch (error) {
      g2t_log(
        `chrome_restore ERROR: extension context invalidated - failed "chrome.storage.sync.get"`
      );
      self?.parent?.popupView?.displayExtensionInvalidReload();
    }
    return this;
  }

  chrome_save() {
    const self = this;
    const id_k = self.id;
    try {
      chrome.storage.sync.set({ [id_k]: JSON.stringify(self.list) });
    } catch (error) {
      g2t_log(
        `chrome_save ERROR: extension context invalidated - failed "chrome.storage.sync.set"`
      );
      self?.parent?.popupView?.displayExtensionInvalidReload();
    }
    return this;
  }

  /**
   * find
   * input: {key: value} pair to search for in list
   * output: index of item found, -1 if not found
   * acoven@2020-05-23
   */
  find(key_value = {}) {
    const key_k = Object.keys(key_value)[0] || '';
    const value_k = key_value[key_k] || '';
    // NOTE (acoven@2020-05-23): FindIndex returns -1 if not found, and
    // 0 is a valid index, so don't || these results:
    const index_k = this.list.findIndex(item => item[key_k] == value_k);
    return index_k;
  }

  lookup(key_value = {}) {
    const index_k = this.find(key_value);
    if (Number.isInteger(index_k) && index_k !== -1) {
      return this.list[index_k];
    }
    return {};
  }

  makeRoom(index = -1) {
    if (!Number.isInteger(index)) {
      return this;
    } else if (index !== -1) {
      // Already know the item we want to remove:
      this.remove(index);
    } else if (this.maxxed()) {
      // We're maxxed, remove oldest:
      const oldest_k = this.oldest();
      this.remove(oldest_k);
    } // Otherwise, do nothing, we've got room
    return this;
  }

  max() {
    return 100;
  }

  maxxed() {
    const len_k = this.list.length;
    const max_k = this.max();
    return len_k >= max_k;
  }

  oldest() {
    /* // NOTE (acoven@2020-05-23): Turn on for circular file
        let lowest_timestamp = -1, // starting value
            index = -1;

        const eol_k = this.list.length - 1;
        // NOTE (acoven@2020-05-23): There are other more clever iterators,
        // but a simple for loop through all items is the fastest way to find
        // the smallest value:
        for (let iter = eol_k; iter >= 0; iter--) {
            const timestamp_k = this.list[iter].timestamp;
            if (lowest_timestamp === -1 || timestamp_k < lowest_timestamp) {
                lowest_timestamp = timestamp_k;
                index = iter;
            }
        }

        return index;
        */
    return 0; // As long as we delete duplicates and grow from bottom, we can just discard top
  }

  push(entry = {}) {
    if (Object.keys(entry).length) {
      // Directly manipulating list to save memcopies:
      this.list.push(entry);
    }
    return this;
  }

  remove(index = -1) {
    if (Number.isInteger(index) && index !== -1) {
      // Found it, remove it
      // Directly manipulating list to save memcopies:
      if (index === 0) {
        this.list.shift();
      } else {
        this.list.splice(index, 1);
      }
    }
    return this;
  }
}; // End, class EmailBoardListCardMap

// End, model.js
