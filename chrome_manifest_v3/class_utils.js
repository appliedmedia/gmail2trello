var G2T = G2T || {}; // must be var to guarantee correct scope - do not alter this line

class Utils {
  constructor(args) {
    this.app = args.app;
    // Remove local state - use centralized app state
    // storageHashes moved to app.persist.storageHashes
  }

  /**
   * Log function. A wrapper for console.log, depends on logEnabled flag
   * @param  {any} data data to write log
   */
  log(data) {
    // Initialize log state if not exists
    if (!this.app.temp.log) {
      this.app.temp.log = {
        memory: [],
        count: 0,
        max: 100,
        debugMode: false,
        lastMessage: null,
        lastMessageCount: 0,
        lastMessageIndex: -1,
      };
    }

    let l = this.app.temp.log;

    if (data) {
      const count_size_k = l.max.toString().length;
      const counter_k = ('0'.repeat(count_size_k) + l.count.toString()).slice(
        -count_size_k,
      );
      const now_k = new Date().toISOString();

      if (typeof data !== 'string') {
        data = JSON.stringify(data);
      }

      const messageContent = `G2T→${data}`;

      // Check if this is a duplicate of the last message
      if (l.lastMessage === messageContent) {
        // Update the existing entry with new timestamp and increment count
        l.lastMessageCount++;
        const lastTimestamp = l.memory[l.lastMessageIndex].split(' ')[0];
        const newTimestamp = now_k;
        l.memory[l.lastMessageIndex] =
          `${lastTimestamp}...x${l.lastMessageCount}...${newTimestamp} ${messageContent}`;

        if (l.debugMode) {
          window.console.log(l.memory[l.lastMessageIndex]);
        }
        // Don't increment the counter for duplicates
        return;
      }

      // New message - store it normally
      const fullMessage = `${now_k}.${counter_k} ${messageContent}`;
      l.memory[l.count] = fullMessage;

      // Update duplicate tracking
      l.lastMessage = messageContent;
      l.lastMessageCount = 1;
      l.lastMessageIndex = l.count;

      if (++l.count >= l.max) {
        l.count = 0;
      }

      if (l.debugMode) {
        window.console.log(fullMessage);
      }
    } else {
      // Return log content with proper newlines
      const afterCount = l.memory.slice(l.count);
      const beforeCount = l.memory.slice(0, l.count);

      // Join with newlines, ensuring proper separation
      let result = '';
      if (afterCount.length > 0) {
        result += afterCount.join('\n');
      }
      if (beforeCount.length > 0) {
        if (result) {
          result += '\n';
        }
        result += beforeCount.join('\n');
      }
      return result;
    }
  }

  static get ck() {
    // class keys here to assure they're treated like consts
    const ck = {
      id: 'g2t_utils',
    };
    return ck;
  }

  get ck() {
    return Utils.ck;
  }

  /**
   * Load a bundled file via chrome.runtime.getURL + fetch
   * Args paradigm: loadFile({ path, dict?, callback? })
   * - path: string relative to extension root (e.g., 'views/popupView.html')
   * - dict: optional replacement dictionary for Utils.replacer
   * - callback: optional function(html) invoked with the loaded (and replaced) text
   * Returns: Promise<string> resolving to the loaded text
   */
  loadFile(args) {
    const { path, dict, callback } = args || {};
    if (!path || typeof path !== 'string') {
      throw new Error('loadFile: invalid or missing path');
    }

    if (typeof fetch !== 'function') {
      throw new Error('loadFile: fetch is not available');
    }

    const url = this.app.goog.runtimeGetURL(path);

    return fetch(url)
      .then(res => res.text())
      .then(text => {
        const finalText = dict ? this.replacer(text, dict) : text;
        if (typeof callback === 'function') {
          try {
            callback(finalText);
          } catch (_) {
            /* ignore callback errors */
          }
        }
        return finalText;
      });
  }

  /**
   * Load data from chrome storage
   */
  loadFromChromeStorage(keyId, emit_on_done = '') {
    this.app.goog.storageSyncGet(keyId, response => {
      const jsonData = response?.[keyId];
      const result = jsonData ? JSON.parse(jsonData) : '';

      // Store hash of loaded data for future comparison
      if (jsonData) {
        this.app.persist.storageHashes[keyId] = this.djb2Hash(jsonData);
      }

      if (emit_on_done) {
        this.app.events.emit(emit_on_done, result);
      }
    });
  }

  /**
   * Save data to chrome storage with hash-based throttling
   */
  saveToChromeStorage(keyId, data) {
    // Stringify once and reuse
    const jsonData = JSON.stringify(data);
    const dataHash = this.djb2Hash(jsonData);
    const dataSize = jsonData.length;

    // Log data size for debugging
    this.log(`saveToChromeStorage: ${keyId} size=${dataSize} bytes`);

    // Check if data is too large (Chrome sync storage limit is ~8KB per item)
    if (dataSize > 7000) {
      this.log(
        `WARNING: Data too large (${dataSize} bytes) for ${keyId}, skipping save`,
      );
      return;
    }

    // Check if we have a stored hash for this key
    const storedHash = this.app.persist.storageHashes[keyId];
    if (storedHash === dataHash) {
      return; // No changes, don't save
    }

    // Update stored hash and save data
    this.app.persist.storageHashes[keyId] = dataHash;

    this.app.goog.storageSyncSet({ [keyId]: jsonData });
  }

  /**
   * Correctly escape RegExp
   */
  escapeRegExp(str = '') {
    return (str || '').replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1');
  }

  // Callback methods for replacer
  replacer_onEach(text, value, key = '') {
    const regex = new RegExp(`%${this.escapeRegExp(key)}%`, 'gi');
    const replaced = text.replace(regex, value);
    return replaced;
  }

  /**
   * Utility routine to replace variables
   */
  replacer(text = '', dict = {}) {
    if (!text || text.length === 0) {
      // this.log('Require text!');
      return text;
    }

    if (!dict || Object.keys(dict).length === 0) {
      this.log('replacer: Require dictionary!');
      return text;
    }

    let result = text;
    let runaway_max = 3;
    while (result.indexOf('%') !== -1 && runaway_max-- > 0) {
      Object.entries(dict).forEach(([key, value]) => {
        result = this.replacer_onEach(result, value, key);
      });
    }

    return result;
  }

  /**
   * Make displayable URI
   */
  uriForDisplay(uri) {
    const uri_display_trigger_length_k = 20;
    const uri_length_max_k = 40;
    let uri_display = uri || '';
    if (uri_display.length > uri_display_trigger_length_k) {
      const re = RegExp('^\\w+://([\\w./_-]+).*?([\\w._-]*)$');
      const matched = uri_display.match(re);
      if (matched && matched.length > 1) {
        const filename_k =
          matched[2].length < uri_length_max_k
            ? matched[2]
            : matched[2].slice(-uri_length_max_k);
        const prelude = matched[1].substr(0, uri_length_max_k);
        if (matched[1].length > uri_length_max_k) {
          uri_display = prelude + '...' + filename_k;
        } else if (filename_k.length > 0) {
          uri_display = prelude + ':' + filename_k;
        } else {
          uri_display = prelude + filename_k;
        }
      }
    }
    return uri_display;
  }

  /**
   * Simple djb2 hash function
   */
  djb2Hash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) + hash + str.charCodeAt(i);
    }
    return hash >>> 0; // unsigned 32-bit
  }

  /**
   * Remove specified fields from object and return clean copy
   */
  excludeFields(obj, fieldsToExclude) {
    const clean = {};
    const excludeSet = new Set(fieldsToExclude);

    // Copy only fields that aren't excluded
    Object.keys(obj).forEach(key => {
      if (!excludeSet.has(key)) {
        clean[key] = obj[key];
      }
    });

    return clean;
  }

  /**
   * Make anchored backlink
   */
  anchorMarkdownify(text, href, comment = '') {
    const text1 = (text || '').trim();
    const text1lc = text1.toLowerCase();
    const href1 = (href || '').trim();
    const href1lc = href1.toLowerCase();
    const comment1 = (comment || '').trim();

    let retn = '';

    if (text1.length < 1 && href1.length < 1) {
      // Intetionally blank
    } else if (text1lc === href1lc) {
      retn = ` <${href1}> `; // This renders correctly in Trello as a sole URL
      // NOTE (Ace, 17-Feb-2017): Turns out Trello doesn't support markdown [] only, so we'll construct a nice displayable text vs url:
      // text1 = this.uriForDisplay(text1);
    } else if (`mailto:${text1lc}` === href1lc) {
      retn = ` <${text1}> `; // This renders correctly in Trello as a mailto: url
    } else {
      const comment1QuotedSpaced = comment1.length > 0 ? ` "${comment1}"` : '';
      retn = ` [${text1}](<${href1}>${comment1QuotedSpaced}) `;
    }

    return retn;
  }

  /**
   * Split an email into name and domain
   */
  splitEmailDomain(email = '') {
    const split = email.split('@');
    const name = split[0] || '';
    const domain = split[1] || '';
    return {
      name,
      domain,
    };
  }

  /**
   * Add trailing char if not empty:
   */
  addChar(front = '', back = '', addChar = ' ') {
    if (front.length > 0) {
      if (back.length > 0) {
        return `${front}${addChar}${back}`;
      } else {
        return `${front}${addChar}`;
      }
    } else if (back.length > 0) {
      return `${addChar}${back}`;
    } else {
      return '';
    }
  }

  /**
   * Add trailing space if not empty:
   */
  addSpace(front = '', back = '') {
    return this.addChar(front, back, ' ');
  }

  /**
   * Add trailing CRLF if not empty:
   */
  addCRLF(front = '', back = '') {
    return this.addChar(front, back, '\n');
  }

  /**
   * Sort markdown elements by length (largest to smallest)
   */
  markdownify_sortByLength(a, b) {
    return b.length - a.length;
  }

  /**
   * Process each element during markdown sorting
   */
  markdownify_onSortEach(context, value = '') {
    const replace = context.toProcess[value];
    const swap = `${context.placeholder}${(context.count++).toString()}`;
    const regex = new RegExp('\\b' + this.escapeRegExp(value) + '\\b', 'gi');
    const replaced = context.body.replace(regex, `%${swap}%`); // Replace occurrence with placeholder
    if (context.body !== replaced) {
      context.replacer_dict[swap] = replace;
      context.body = replaced;
    }
  }

  /**
   * Process each element during markdown processing
   */
  markdownify_onElementEach(context, replaceText) {
    if (context.element_meets_min_length) {
      const replace = context.self.replacer(replaceText, {
        text: context.element_text,
      });
      context.toProcess[context.element_text.toLowerCase()] = replace; // Intentionally overwrites duplicates
    }
  }

  /**
   * Process headers during markdown processing
   */
  markdownify_onHeaderEach(context) {
    const nodeName = context.element.nodeName || '0';
    if (nodeName && context.element_meets_min_length) {
      const headerLevelText = nodeName.substr(-1);
      const headerLevel = parseInt(headerLevelText, 10);
      const headerMarkdown = `\n\n${'#'.repeat(headerLevel)} ${
        context.element_text
      }\n\n`;
      context.toProcess[context.element_text.toLowerCase()] = headerMarkdown; // Intentionally overwrites duplicates
    }
  }

  /**
   * Process links during markdown processing
   */
  markdownify_onLinkEach(context) {
    const href = (
      context.element.getAttribute('href') ||
      context.element.href ||
      ''
    ).trim(); // Note, .href DOM adds trailing slash to bare URLs changing the input sometimes
    if (href && context.element_meets_min_length) {
      context.toProcess[context.element_text.toLowerCase()] =
        context.self.anchorMarkdownify(context.element_text, href); // Intentionally overwrites duplicates
    }
  }

  /**
   * Check if a markdown feature is enabled
   */
  markdownify_featureEnabled(features, elementTag = '') {
    return features === false ? false : features?.[elementTag] !== false;
  }

  /**
   * Sort and placeholderize markdown elements
   */
  markdownify_sortAndPlaceholderize(context) {
    if (context.toProcess) {
      Object.keys(context.toProcess)
        .sort(context.self.markdownify_sortByLength.bind(context.self))
        .forEach(
          context.self.markdownify_onSortEach.bind(context.self, context),
        );
    }
  }

  /**
   * Process markdown for a specific element tag
   */
  markdownify_processMarkdown(context, elementTag, replaceText) {
    if (context.self.markdownify_featureEnabled(context.features, elementTag)) {
      for (const element of context.html.querySelectorAll(elementTag)) {
        context.element = element;
        context.element_text = (element.textContent || '').trim();
        context.element_meets_min_length =
          context.element_text.length >= context.min_text_length;

        // Check if replaceText is a function or string
        if (typeof replaceText === 'function') {
          // Call the function directly (e.g., markdownify_onHeaderEach)
          replaceText.call(context.self, context);
        } else {
          // Use string replacement (existing behavior)
          context.self.markdownify_onElementEach(context, replaceText);
        }
      }
    }
  }

  /**
   * Repeat replace until no more changes or max attempts reached
   */
  markdownify_repeatReplace(context, inRegexp, replaceWith) {
    let runaway = 11; // max replace attempts to prevent runaway
    let previous;

    do {
      previous = context.body;
      context.body = context.body.replace(inRegexp, replaceWith);
    } while (context.body !== previous && --runaway > 0);
  }

  /**
   * Markdownify a text block
   */
  markdownify(emailBody, features, preprocess) {
    if (!emailBody) {
      this.log('markdownify: Require emailBody!');
      return '';
    }

    // Resolve to a native Element (compat until all callers pass native elements)
    let nativeBody;
    if (emailBody instanceof Element) {
      // Already a native element — preferred path after Lane 3 lands
      nativeBody = emailBody;
    } else if (emailBody[0] instanceof Element) {
      // jQuery wrapper with a real element at [0]
      nativeBody = emailBody[0];
    } else {
      // Fallback: plain mock with .innerHTML; build a temporary container
      const tmpDiv = document.createElement('div');
      tmpDiv.innerHTML = emailBody.innerHTML || '';
      nativeBody = tmpDiv;
    }

    // Create markdownify context with all constants and state
    let context = {
      // Constants
      placeholder: 'g2t_placeholder:',
      min_text_length: 4,

      // State variables
      count: 0,
      replacer_dict: preprocess || {}, // Use preprocess data if provided
      html: nativeBody,
      body: nativeBody.innerHTML || '',
      toProcess: {},

      // References for clarity
      self: this, // Reference to the Utils class instance
      element: null, // Will be set for each element being processed
      element_text: '', // Will be set for each element being processed
      element_meets_min_length: false, // Will be set for each element being processed
      features: features, // Markdown features configuration
    };

    // Step 1: Normalize line endings to \n
    let replacements = [
      {
        // Normalize line endings to \n (with surrounding whitespace)
        pattern: new RegExp('[ \\t]*[\\n\\r\\f\\v][ \\t]*', 'g'),
        repl: '\n',
      },
    ];

    // Process line ending normalization
    replacements.forEach(({ pattern, repl }) => {
      context.body = context.body.replace(pattern, repl);
    });

    // Step 2: Handle block elements with proper spacing
    replacements = [
      {
        // Convert horizontal rules to markdown with proper spacing
        pattern: new RegExp('\\s*<hr[^>]*>\\s*', 'g'),
        repl: '\n\n---\n\n',
      },
      {
        // Convert horizontal rules to markdown
        pattern: new RegExp('\\s*[-=_]{4,}\\s*', 'g'),
        repl: '\n\n---\n\n',
      },
      {
        // Convert paragraph tags to double line breaks
        pattern: new RegExp('\\s*</?p[^>]*>\\s*', 'g'),
        repl: '\n\n',
      },
      {
        // Convert div tags to double line breaks
        pattern: new RegExp('\\s*</?div[^>]*>\\s*', 'g'),
        repl: '\n\n',
      },
      {
        // Convert break tags to single line breaks
        pattern: new RegExp('\\s*<br[^>]*>\\s*', 'g'),
        repl: '\n',
      },
    ];

    // Process block element replacements
    replacements.forEach(({ pattern, repl }) => {
      context.body = context.body.replace(pattern, repl);
    });

    // Step 3: Remove remaining HTML tags (inline elements)
    context.body = context.body.replace(new RegExp('<[^>]*>', 'g'), '');

    // Step 4: Decode HTML entities
    context.body = context.self.decodeEntities(context.body);

    // Step 5: Process markdown elements and text patterns
    replacements = [{}];

    // Process additional replacements
    replacements.forEach(({ pattern, repl }) => {
      context.body = context.body.replace(pattern, repl);
    });

    // Pass 1: Collect tagged items
    replacements = [
      { tag: 'strong', repl: '**%text%**' },
      { tag: 'b', repl: '**%text%**' },
      { tag: 'em', repl: '*%text%*' },
      { tag: 'i', repl: '*%text%*' },
      { tag: 'u', repl: '__%text%__' },
      { tag: 'strike', repl: '~~%text%~~' },
      { tag: 's', repl: '~~%text%~~' },
      { tag: 'del', repl: '~~%text%~~' },
      { tag: 'h1', repl: this.markdownify_onHeaderEach },
      { tag: 'h2', repl: this.markdownify_onHeaderEach },
      { tag: 'h3', repl: this.markdownify_onHeaderEach },
      { tag: 'h4', repl: this.markdownify_onHeaderEach },
      { tag: 'h5', repl: this.markdownify_onHeaderEach },
      { tag: 'h6', repl: this.markdownify_onHeaderEach },
      { tag: 'a', repl: this.markdownify_onLinkEach },
    ];

    // Process each element type
    replacements.forEach(({ tag, repl }) => {
      this.markdownify_processMarkdown(context, tag, repl);
    });

    // Pass 2: Remove duplicates and sort by length
    this.markdownify_sortAndPlaceholderize(context);

    // Pass 3: Replace with final text
    context.body = this.replacer(context.body, context.replacer_dict);

    // Clean up the body:
    replacements = [
      {
        // Replace tab with space (but preserve leading tabs for Markdown formatting)
        pattern: new RegExp('(?!^\\t+)\\t', 'g'),
        repl: ' ',
      },
      {
        // Replace middle dot bullets with asterisks
        pattern: new RegExp(' *\\n+ *·\\s*', 'g'),
        repl: '\n\n* ',
      },
      {
        // Replace remaining bullets with asterisks
        pattern: new RegExp('·', 'g'),
        repl: '*',
      },
      {
        // Handle empty elements by ensuring they create spacing
        pattern: new RegExp('\\n +\\n', 'g'),
        repl: '\n\n',
      },
      {
        // Normalize multiple line breaks to double line breaks (paragraph breaks)
        pattern: new RegExp('\\n{3,}', 'g'),
        repl: '\n\n',
      },
    ];

    // Process cleanup replacements
    replacements.forEach(({ pattern, repl }) => {
      context.body = context.body.replace(pattern, repl);
    });

    replacements = [
      {
        // (1) Replace 2 or more spaces (but not newlines) with just one (should use RepeatReplace() for this)
        pattern: new RegExp(' {2,}', 'g'),
        repl: ' ',
      },
      {
        // (2) Replace 3 or more CRs with just two (need RepeatReplace() for this)
        pattern: new RegExp('\\n{3,}', 'g'),
        repl: '\n\n',
      },
    ];

    // Process final replacements with repeatReplace for all
    replacements.forEach(({ pattern, repl }) => {
      this.markdownify_repeatReplace(context, pattern, repl);
    });

    // (5) Trim excess at beginning and end:
    context.body = context.body.trim();

    return context.body;
  }

  /**
   * Determine luminance of a color so we can augment with darker/lighter background
   */
  luminance(color) {
    const bkColorLight = 'lightGray'; // or white
    const bkColorDark = 'darkGray'; // 'gray' is even darker
    let bkColorReturn = bkColorLight;

    const re = new RegExp('rgb\\D+(\\d+)\\D+(\\d+)\\D+(\\d+)');
    const matched = color.match(re, 'i');
    if (matched && matched.length > 2) {
      // 0 is total string:
      const r = matched[1];
      const g = matched[2];
      const b = matched[3];
      // var 1 = matched[4]; // if alpha is provided

      let luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709

      if (luma < 40) {
        bkColorReturn = bkColorDark;
      } else {
        bkColorReturn = bkColorLight;
      }
    } else {
      bkColorReturn = bkColorLight; // RegExp failed, assume dark color
    }

    return 'inherit' || bkColorReturn; // Use: bkColorReturn if you want to adjust background based on text perceived brightness
  }

  /**
   * HTML bookend a string
   */
  bookend(bookend, text, style) {
    return (
      '<' +
      bookend +
      (style ? ' style="' + style + '"' : '') +
      '>' +
      (text || '') +
      '</' +
      bookend +
      '>'
    );
  }

  /**
   * Get selected text
   * http://stackoverflow.com/questions/5379120/get-the-highlighted-selected-text
   */
  getSelectedText() {
    let text = '';
    const activeEl = document.activeElement;
    const activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null;
    if (
      (activeElTagName === 'textarea' || activeElTagName === 'input') &&
      /^(?:text|search|password|tel|url)$/i.test(activeEl.type) &&
      typeof activeEl.selectionStart === 'number'
    ) {
      text = activeEl.value
        .slice(activeEl.selectionStart, activeEl.selectionEnd)
        .trim();
    } else if (document.selection) {
      text = document.selection.createRange().text.trim();
    } else if (document.getSelection) {
      text = document.getSelection().toString().trim();
    } else if (window.getSelection) {
      text = window.getSelection().toString().trim();
    }
    return text;
  }

  /**
   * Truncate a string
   */
  truncate(text, max, add) {
    let retn = text || '';
    const add_k = this.decodeEntities(add || '');
    const max_k = max - add_k.length;

    if (text && text.length > max_k) {
      retn = text.slice(0, max_k) + add_k;
    }
    return retn;
  }

  /***
   * Middle-truncate a string
   */
  midTruncate(text, max, add) {
    let retn = text || '';
    const add_k = this.decodeEntities(add || '');
    const max_k = Math.abs((max || 0) - add_k.length);
    const mid_k = (max_k + 0.01) / 2;

    if (text && text.length > max_k) {
      retn = text.slice(0, mid_k + 1) + add_k + text.slice(-mid_k);
    }
    return retn;
  }

  /**
   * Encode entities
   */
  encodeEntities(sourceText) {
    const ta = document.createElement('textarea');
    ta.value = sourceText;
    return ta.innerHTML;
  }

  // Callback methods for decodeEntities
  decodeEntities_onEach(sourceText, value, key) {
    // value is already available from the callback parameter
    const regex = new RegExp(this.escapeRegExp(key), 'gi');
    const replaced = sourceText.replace(regex, value);
    return replaced;
  }

  /**
   * Decode entities
   */
  decodeEntities(sourceText) {
    const dict_k = { '&hellip;': '...', '&bullet;': '*', '&mdash;': '-' };
    Object.entries(dict_k).forEach(([key, value]) => {
      sourceText = this.decodeEntities_onEach(sourceText, value, key);
    });
    try {
      const new_s = decodeURIComponent(sourceText);
      sourceText = new_s;
    } catch (e) {
      // Didn't work. Ignore.
    }
    const ta = document.createElement('textarea');
    ta.style.cssText = 'white-space: pre-line;';
    ta.innerHTML = sourceText;
    return ta.value;
  }

  /**
   * Check for ctrl/alt/shift down:
   */
  modKey(event) {
    let retn = '';

    if (event.ctrlKey) {
      retn = 'ctrl-';
      if (event.ctrlLeft) {
        retn = 'left';
      }
    } else if (event.altKey) {
      retn = 'alt-';
      if (event.altLeft) {
        retn = 'left';
      }
    } else if (event.shiftKey) {
      retn = 'shift-';
      if (event.shiftLeft) {
        retn += 'left';
      }
    } else if (event.metaKey) {
      retn = 'metakey-';
      if (window.navigator.platform.indexOf('Mac') !== -1) {
        retn += 'clover';
      } else {
        retn += 'windows';
      }
    }

    // If the string is partial, then it was the right-side key:
    if (retn.slice(-1) === '-') {
      retn += 'right';
    }

    return retn;
  }

  url_add_var(url_in = '', var_in = '') {
    let add = '';
    if (url_in && url_in.length && var_in && var_in.length) {
      add = '&';
      if (url_in.indexOf('?') === -1) {
        add = '?';
      }
    }

    return url_in + add + var_in;
  }

  /**
   * Make avatar URL
   * NOTE (Ace@2020-04-03): 403s: "https://trello-avatars.s3.amazonaws.com/" + avatarHash + "/30.png";
   * Gravatar requires md5 hash of lowercase email address [see "https://www.gravatar.com/site/implement/images/"]:
   * "https://www.gravatar.com/avatar/" + gravatarHash + ".jpg?s=30";
   * avatarUrl return format is "https://trello-members.s3.amazonaws.com/{member-id}/{member-avatar-hash}/30.png"
   */
  makeAvatarUrl(args) {
    return args?.avatarUrl ? `${args.avatarUrl}/30.png` : '';
  }

  /**
   * Return all following siblings of el that match sel
   */
  nextAllMatching(el, sel) {
    const out = [];
    for (let s = el.nextElementSibling; s; s = s.nextElementSibling) {
      if (s.matches(sel)) out.push(s);
    }
    return out;
  }

  // Event binding
  bindEvents() {
    // No events to bind
  }

  init() {
    // Utils initialization if needed
    this.bindEvents();
    // State is loaded centrally by app
  }
}

// Assign class to namespace
G2T.Utils = Utils;

// End, class_utils.js
