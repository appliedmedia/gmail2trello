var G2T = G2T || {}; // must be var to guarantee correct scope - do not alter this line

class GmailView {
  static get ck() {
    // class keys here to assure they're treated like consts
    const ck = {
      id: 'g2t_gmailview',
      uniqueUriVar: 'g2t_filename',
    };
    return ck;
  }

  get ck() {
    return GmailView.ck;
  }

  constructor(args) {
    this.app = args.app;
    // Remove local state - use centralized app state

    this.LAYOUT_DEFAULT = 0;
    this.LAYOUT_SPLIT = 1;
    this.root = null; // was: this.$root
    this.parsingData = false;
    this.runaway = 0;

    // Create WaitCounter instance
    this.waitCounter = new G2T.WaitCounter({ app: this.app });

    this.selectors = {
      // OBSOLETE (Ace, 2021-02-27): Missing too much context having it all here, and needed to process many of them, so moved into context of where code used them
      // selectors mapping, modify here when gmail's markup changes:
      // toolbarButton: '.G-Ni:first', // (Ace, 2020-12-01): OBSOLETE?
      // emailThreadID: ".a3s.aXjCH", // (Ace, 2020-12-01): OBSOLETE?
      // emailInThreads: ".kv,.h7", // (Ace, 2020-12-01): OBSOLETE?
      // hiddenEmails: ".kv", // (Ace, 2020-12-01): OBSOLETE?
      // viewportSplit: '.aNW:first', // reading panel OBSOLETE (Ace, 2020-02-15): Don't know that this is ever used any more
      // emailCC: "span.g2", // Was: "span[dir='ltr'].g2",
      // emailFromNameAddress: "span.gD",
      // emailBody: ".adn.ads .gs:first .a3s.aiL", // Was: '.a3s.aXjCH', // Was: "div[dir='ltr']:first", // Was: '.adP:first', // Was: '.adO:first'
      // emailAttachments: ".aZo", // Was: '.aQy',
      // timestamp: ".gH .gK .g3",
      // emailSubject: ".hP",
      // emailIDs: [
      //    "data-thread-perm-id",
      //    "data-thread-id",
      //    "data-legacy-thread-id",
      //],
      // viewport: ".aia, .nH", // .aia = split view, .nH = breakout view // Was: '.aeJ:first', now using .first()
      // expandedEmails: ".h7",
      // host: "span[dir='ltr']", // Was: 'a.gb_b.gb_eb.gb_R' // OBSOLETE (Ace, 2020-12-29)
      // emailEmbedded: "div[dir='ltr']",
      // emailEmbeddedTitle: ".T-I.J-J5-Ji.aQv.T-I-ax7.L3.a5q",
      // emailEmbeddedNameAttr: "aria-label",
    };
  }

  // Private helper: collect subsequent sibling elements matching a CSS selector.
  // Replaces jQuery's .nextAll(sel) for the image-embedded walk.
  _nextAllMatching(el, sel) {
    const results = [];
    let sibling = el.nextElementSibling;
    while (sibling) {
      if (sibling.matches(sel)) {
        results.push(sibling);
      }
      sibling = sibling.nextElementSibling;
    }
    return results;
  }

  // Callback methods for detectToolbar
  detectToolbar_onTimeout() {
    this.runaway++;
    if (this.runaway > 10) {
      this.app.utils.log('ERROR GmailView:detectToolbar RUNAWAY TRIGGERED');
      return;
    }
    this.detectToolbar();
  }

  // Callback methods for detectEmailOpeningMode
  detectEmailOpeningMode_onEmailClick() {
    this.waitCounter.start('emailclick', 500, 5, () => {
      if (this.detectEmailOpeningMode()) {
        //this.event.emit('onEmailChanged');
        this.waitCounter.stop('emailclick');
      }
    });
  }

  // Helper methods for parseData
  url_with_filename(url_in = '', var_in = '') {
    return this.app.utils.url_add_var(
      url_in,
      `${this.ck.uniqueUriVar}=/${var_in}`,
    );
  }

  displayNameAndEmail(name = '', email = '') {
    let display = '';

    if (name) {
      if (email) {
        display = `${name} <${email}>`;
      } else {
        display = name;
      }
    } else if (email) {
      display = `<${email}>`;
    }

    return display;
  }

  email_raw_md(name = '', email = '') {
    let raw = '',
      md = '';
    if (!name && !email) {
      return {
        raw,
        md,
      };
    }

    // introduce a local variable instead of reassigning the `name` parameter
    let displayName = name;
    if (!name) {
      displayName = this.app.utils.splitEmailDomain(email)?.name || '';
    } else if (name.toUpperCase() === email.toUpperCase()) {
      // split out @domain when name and email match exactly
      displayName = this.app.utils.splitEmailDomain(name)?.name || name;
    }

    raw = this.displayNameAndEmail(displayName, email);

    if (displayName) {
      if (email) {
        md = `[${displayName}](<${email}>)`;
      } else {
        md = displayName;
      }
    } else if (email) {
      md = email;
    }

    return {
      raw,
      md,
    };
  }

  // Callback methods for parseData
  parseData_onVisibleMailEach(index, element) {
    if (
      this.visibleMail === null &&
      element.getBoundingClientRect().top + window.scrollY >= this.y0
    ) {
      this.visibleMail = element; // was: this.$visibleMail = $(element)
    }
  }

  parseData_onEmailCCEach(index, element) {
    const email = (element.getAttribute('email') || '').trim();
    let name = (element.getAttribute('name') || '').trim();
    // NOTE (Ace, 2021-01-04): Replacing NAME of "me" with Trello ID name (may want to confirm email match too?):
    if (name == 'me') {
      if (this.fullName_k) {
        name = this.fullName_k;
      } else if (this.me_name) {
        name = this.me_name;
      } else {
        this.me_email = email;
      }
    }
    if (email?.length > 0) {
      if (email == this.me_email && name !== 'me') {
        this.me_name = name;
      }
      this.emailCC.push({
        email,
        name,
      });
    }
  }

  parseData_onAttachmentEach(index, element) {
    const item_k = element.getAttribute('download_url');
    if (item_k?.length > 0) {
      const attachment = item_k.match(/^([^:]+)\s*:\s*([^:]+)\s*:\s*(.+)$/);
      if (attachment && attachment.length > 3) {
        const name_k = this.app.utils.decodeEntities(attachment[2]); // was: decodeURIComponent
        const url_k = attachment[3]; // Was: this.app.utils.midTruncate(attachment[3], 50, '...');
        this.attachment.push({
          mimeType: attachment[1],
          name: name_k,
          // NOTE (Ace@2017-04-20): Adding this explicitly at the end of the URL so it'll pick up the "filename":
          url: this.url_with_filename(url_k, name_k),
          checked: 'false',
        }); // [0] is the whole string
      }
    }
  }

  parseData_onEmailCCIterate(iter, item) {
    if (item.name == 'me') {
      // We didn't have your full name in time to replace it earlier, we'll try now:
      item.name = this.me_name || 'me';
    }
    Object.assign(
      this.preprocess['a'],
      this.make_preprocess_mailto(item.name, item.email),
    );
    let cc_raw_md = this.email_raw_md(item.name, item.email);
    if (cc_raw_md.raw.length > 0 || cc_raw_md.md.length > 0) {
      if (!this.cc_raw.length || !this.cc_md.length) {
        this.cc_raw = 'To: ';
        this.cc_md = 'To: ';
      } else {
        this.cc_raw += ', ';
        this.cc_md += ', ';
      }
      this.cc_raw += cc_raw_md.raw;
      this.cc_md += cc_raw_md.md;
    }
  }

  parseData_onImageEach(index, element) {
    const href_k = (element.src || '').trim(); // Was: $(element).prop('src')
    const alt_k = element.alt || ''; // Was: $(element).prop('alt')
    // <div id=":cb" class="T-I J-J5-Ji aQv T-I-ax7 L3 a5q" role="button" tabindex="0" aria-label="Download attachment Screen Shot 2020-02-05 at 6.04.37 PM.png" data-tooltip-class="a1V" data-tooltip="Download"><div class="aSK J-J5-Ji aYr"></div></div>}
    const divs_k = this._nextAllMatching(element, "div[dir='ltr']"); // emailEmbedded; was: $(element).nextAll("div[dir='ltr']")
    const div1_k =
      divs_k.length > 0
        ? divs_k[0].querySelector('.T-I.J-J5-Ji.aQv.T-I-ax7.L3.a5q')
        : null; // emailEmbeddedTitle; was: $divs_k.find(...).first()
    const aria_k = (div1_k ? div1_k.getAttribute('aria-label') : '') || ''; // emailEmbeddedNameAttr
    const aria_split_k = aria_k.split('Download attachment ');
    const aria_name_k = aria_split_k[aria_split_k.length - 1] || '';
    const name_k =
      (alt_k.length > aria_name_k.length ? alt_k : aria_name_k) ||
      this.app.utils.uriForDisplay(href_k) ||
      '';
    const display_k = this.app.utils.decodeEntities(
      this.app.utils.midTruncate(name_k.trim(), 50, '...'),
    );
    const type_k = (element.type || 'text/link').trim(); // Was: $(element).prop('type')
    if (href_k.length > 0 && display_k.length > 0) {
      // Will store as key/value pairs to automatically overide duplicates
      this.emailImage[href_k] = {
        mimeType: type_k,
        name: display_k,
        url: this.url_with_filename(href_k, name_k),
        checked: 'false',
      };
    }
  }

  make_preprocess_mailto(name, email) {
    let forms = [
      '%name% <%email%>',
      '%name% (%email%)',
      '%name% %email%',
      '"%name%" <%email%>',
      '"%name%" (%email%)',
      '"%name%" %email%',
    ];

    const dict = {
      name,
      email,
    };

    let anchor_md = this.app.utils.anchorMarkdownify(name, email); // Don't need to add 'mailto:'

    let retn = {};

    forms.forEach(item => {
      let item1 = this.app.utils.replacer(item, dict);
      retn[item1.toLowerCase()] = anchor_md;
    });

    return retn;
  }

  preDetect() {
    // this.app.utils.log('GmailView:preDetect');

    this.app.persist.layoutMode = this.LAYOUT_DEFAULT;
    this.root = document.body; // was: this.$root = $('body')

    return this.detectToolbar();
  }

  detect() {
    // this.app.utils.log('GmailView:detect');

    const pre_k = this.preDetect();

    if (pre_k) {
      this.app.events.emit('onDetected');
    } else {
      this.detectEmailOpeningMode();
    }
  }

  // Force a complete redraw of the G2T button
  forceRedraw() {
    this.app.utils.log('GmailView:forceRedraw - forcing complete redraw');

    // Clear any existing button to force recreation
    const existingButton = document.getElementById('g2tButton'); // was: $('#g2tButton')
    if (existingButton) {
      existingButton.remove();
    }

    // Clear any existing popup
    const existingPopup = document.getElementById('g2tPopup'); // was: $('#g2tPopup')
    if (existingPopup) {
      existingPopup.remove();
    }

    // Reset state
    this.$toolBar = null;
    this.runaway = 0;

    // Trigger popup view redraw as well
    if (
      this.app.popupView &&
      typeof this.app.popupView.handleForceRedraw === 'function'
    ) {
      this.app.popupView.handleForceRedraw();
    }

    // Trigger fresh detection
    this.detect();
  }

  detectToolbar() {
    // was: $("[gh='mtb']", this.$root)
    let toolBar = this.root ? this.root.querySelector("[gh='mtb']") : null;

    // was: while ($($toolBar).children().length === 1) { $toolBar = $($toolBar).children().first(); }
    while (toolBar && toolBar.children.length === 1) {
      toolBar = toolBar.children[0];
    }

    this.$toolBar = toolBar;

    const haveToolBar_k = toolBar != null;

    if (!haveToolBar_k) {
      setTimeout(() => this.detectToolbar_onTimeout(), 2000);
    } else {
      // Only reset runaway when we successfully find the toolbar
      this.runaway = 0;
    }

    return haveToolBar_k;
  }

  detectEmailOpeningMode() {
    // was: this.$expandedEmails = this.$root.find('.h7')
    this.expandedEmails = this.root
      ? Array.from(this.root.querySelectorAll('.h7'))
      : [];

    const result =
      this.$toolBar && this.expandedEmails && this.expandedEmails.length > 0;
    if (result) {
      // this.app.utils.log('detectEmailOpeningMode: Detected an email is opening: ' + JSON.stringify(this.expandedEmails));

      //bind events
      let counter = 0;
      // was: this.$root.find('.kv:not([g2t_event]), ...').each(...)
      const bindTargets = this.root
        ? Array.from(
            this.root.querySelectorAll(
              '.kv:not([g2t_event]), .h7:not([g2t_event]), .kQ:not([g2t_event]), .kx:not([g2t_event])',
            ),
          )
        : [];
      bindTargets.forEach(element => {
        counter++;
        element.setAttribute('g2t_event', 1); // was: $(element).attr('g2t_event', 1)
        element.addEventListener('click', () =>
          this.detectEmailOpeningMode_onEmailClick(),
        ); // was: .click(...)
      });
      this.app.utils.log(
        'detectEmailOpeningMode: Binded email threads click events: ' +
          counter +
          ' items',
      );

      this.app.events.emit('onDetected');
    }
    return result;
  }

  parseData(args = {}) {
    // this.app.utils.log('parseData');
    if (this.parsingData) {
      return;
    }

    let data = {};

    this.fullName_k = args?.fullName || '';

    // was: $('.aia, .nH', this.$root).first()
    const viewport =
      (this.root && this.root.querySelector('.aia')) ||
      (this.root && this.root.querySelector('.nH')) ||
      null;
    //  }
    // this.app.utils.log('GmailView:parseData::viewport: ' + JSON.stringify(viewport));
    if (!viewport) {
      return;
    }

    this.y0 = viewport.getBoundingClientRect().top + window.scrollY; // was: $viewport.offset().top
    //this.app.utils.log(y0);
    this.visibleMail = null; // was: this.$visibleMail = null
    // parse expanded emails again
    // was: $('.h7', this.$root).each(...)
    if (this.root) {
      Array.from(this.root.querySelectorAll('.h7')).forEach((element, index) =>
        this.parseData_onVisibleMailEach(index, element),
      );
    }

    if (!this.visibleMail) {
      return;
    }

    // Grab first email that's visible that we can find:
    // was: $('.adn.ads div.gs', this.$visibleMail).first()
    const email1_k = this.visibleMail.querySelector('.adn.ads div.gs');

    // Check for email body first. If we don't have this, then bail.
    // was: $('.a3s.aiL', $email1_k).first()
    const emailBody1_k = email1_k ? email1_k.querySelector('.a3s.aiL') : null;
    if (!emailBody1_k) {
      this.app.utils.log(
        'GmailView:parseData::emailBody: ' + JSON.stringify(emailBody1_k),
      );
      return;
    }

    this.parsingData = true;

    // email ccs which includes from name
    // was: $('span.g2', $email1_k)
    const emailCC_k = email1_k
      ? Array.from(email1_k.querySelectorAll('span.g2'))
      : [];
    this.me_email = '';
    this.me_name = '';
    this.emailCC = [];
    emailCC_k.forEach((element, index) =>
      this.parseData_onEmailCCEach(index, element),
    );

    // email name
    // was: $('span.gD', $email1_k)
    const emailFromNameAddress_k = email1_k
      ? email1_k.querySelector('span.gD')
      : null;
    let emailFromName = (
      emailFromNameAddress_k
        ? emailFromNameAddress_k.getAttribute('name') || ''
        : ''
    ).trim();
    let emailFromAddress = (
      emailFromNameAddress_k
        ? emailFromNameAddress_k.getAttribute('email') || ''
        : ''
    ).trim();
    if (
      this.me_name.length < 1 &&
      emailFromName.length > 0 &&
      emailFromAddress == this.me_email
    ) {
      // Try to correct "me" name if present:
      this.me_name = emailFromName;
    }

    // email attachment
    this.attachment = [];
    // was: $('span.aZo', $email1_k).each(...)
    if (email1_k) {
      Array.from(email1_k.querySelectorAll('span.aZo')).forEach(
        (element, index) => this.parseData_onAttachmentEach(index, element),
      );
    }

    data.attachment = this.attachment;

    // timestamp
    // was: $('.gH .gK .g3', $email1_k).first()
    const time_k = email1_k ? email1_k.querySelector('.gH .gK .g3') : null;
    const timeAttr_k = (
      time_k
        ? time_k.getAttribute('title') ||
          time_k.textContent ||
          time_k.getAttribute('alt')
        : ''
    ).trim();

    /* Used to do this to convert to a true dateTime object, but there is too much hassle in doing so:
      const timeCorrected_k = this.app.parseInternationalDateTime(timeAttr_k);
      const timeAsDate_k = (timeCorrected_k !== '' ? new Date (timeCorrected_k) : '');
      const timeAsDateInvalid_k = timeAsDate_k ? isNaN (timeAsDate_k.getTime()) : true;

      data.time = (timeAsDateInvalid_k ? 'recently' : timeAsDate_k.toString(this.dateFormat || 'MMM d, yyyy'));
      */

    data.time = timeAttr_k || 'recently';

    if (data.time === 'recently') {
      this.app.utils.log(
        'time-debug: ' +
          JSON.stringify({
            timeAttr_k: timeAttr_k,
            /*
              'timeCorrected_k': timeCorrected_k,
              'timeAsDate_k': timeAsDate_k,
              'timeAsDateInvalid_k': timeAsDateInvalid_k,
              */
            time_k: time_k,
          }),
      );
    }

    let from_raw_md = this.email_raw_md(emailFromName, emailFromAddress);
    const from_raw = `From: ${this.app.utils.addSpace(
      from_raw_md.raw,
      data.time,
    )}`;
    const from_md = `From: ${this.app.utils.addSpace(
      from_raw_md.md,
      data.time,
    )}`;

    // subject
    // was: $('.hP', this.$root).first()
    const subjectEl = this.root ? this.root.querySelector('.hP') : null; // Is above the primary first email, so grab it from root
    data.subject = (subjectEl ? subjectEl.textContent : '').trim();

    // Find emailId via legacy
    // <span data-thread-id="#thread-f:1602441164947422913" data-legacy-thread-id="163d03bfda277ec1" data-legacy-last-message-id="163d03bfda277ec1">Tips for using your new inbox</span>
    const emailIDs_k = [
      'data-thread-perm-id',
      'data-thread-id',
      'data-legacy-thread-id',
    ];
    const ids_len_k = emailIDs_k.length;
    let iter = 0;

    data.emailId = 0;
    do {
      // was: $subject.attr(emailIDs_k[iter])
      data.emailId = (
        subjectEl ? subjectEl.getAttribute(emailIDs_k[iter]) || '' : ''
      ).trim(); // Try new Gmail format
    } while (!data.emailId && ++iter < ids_len_k);

    // OBSOLETE (Ace, 2021-02-27): Don't think this even exists any more:
    if (!data.emailId) {
      // try to find via explicitly named class item:
      var emailIdViaClass =
        emailBody1_k?.classList?.[emailBody1_k.classList?.length - 1]; // was: $emailBody1_k[0]?.classList?...
      if (emailIdViaClass && emailIdViaClass.length > 1) {
        if (
          emailIdViaClass.charAt(0) === 'm' &&
          emailIdViaClass.charAt(1) <= '9'
        ) {
          // Only useful class is m####### otherwise use data legacy
          data.emailId = emailIdViaClass.substr(1);
        } else {
          data.emailId = 0; // Didn't find anything useful
        }
      } else {
        data.emailId = 0;
      }
    }

    let subject = encodeURIComponent(data.subject);
    let dateSearch = encodeURIComponent(data.time);

    let txtAnchor = 'Search';
    let txtDirect = `https://mail.google.com/mail/#search/${subject}`;
    let txtDirectComment = 'Search by subject';

    if (data.emailId && data.emailId.length > 1) {
      txtAnchor = 'id';
      txtDirect = `https://mail.google.com${window.location.pathname}#all/${data.emailId}`;
      txtDirectComment = 'Open by id';
    }

    const txtSearch = `https://mail.google.com/mail/#advanced-search/subset=all&has=${subject}&within=1d&date=${dateSearch}`;

    data.linkAsRaw = `[<${txtDirect}> | <${txtSearch}>]\n`;
    data.linkAsMd = `[${this.app.utils
      .anchorMarkdownify(txtAnchor, txtDirect, txtDirectComment)
      .trim()} | ${this.app.utils
      .anchorMarkdownify('time', txtSearch, 'Search by subject + time')
      .trim()}]\n`;

    let a = this.make_preprocess_mailto(emailFromName, emailFromAddress);
    this.preprocess = {
      a,
    };

    this.cc_raw = '';
    this.cc_md = '';

    // was: $.each(this.emailCC, (iter, item) => ...)
    this.emailCC.forEach((item, i) => this.parseData_onEmailCCIterate(i, item));

    if (this.cc_raw.length > 0) {
      this.cc_raw += '\n';
    }
    if (this.cc_md.length > 0) {
      this.cc_md += '\n';
    }

    let selectedText = this.app.utils.getSelectedText();

    data.ccAsRaw = this.cc_raw;
    data.ccAsMd = this.cc_md;

    // Pass native element directly; Lane 4 will update markdownify receiver.
    // was: this.app.utils.markdownify($emailBody1_k, ...)
    data.bodyAsRaw = `${from_raw}:\n\n${
      selectedText ||
      this.app.utils.markdownify(emailBody1_k, false, this.preprocess)
    }`;
    data.bodyAsMd = `${from_md}:\n\n${
      selectedText ||
      this.app.utils.markdownify(emailBody1_k, true, this.preprocess)
    }`;

    this.emailImage = {};

    // was: $('img', $emailBody1_k).each(...)
    Array.from(emailBody1_k.querySelectorAll('img')).forEach((element, index) =>
      this.parseData_onImageEach(index, element),
    );

    data.image = Object.values(this.emailImage);

    //var t = (new Date()).getTime();
    //this.app.utils.log('Elapsed: '+(t-startTime)/1000);
    this.parsingData = false;

    return data;
  }

  handleGmailDetected() {
    this.app.popupView.$toolBar = this.$toolBar;
    // this.app.popupView.init(); // Redundant - App.init() already calls this
  }

  handleDetectButton() {
    if (this.preDetect()) {
      this.app.popupView.$toolBar = this.$toolBar;
      this.app.popupView.finalCreatePopup();
    }
  }

  bindEvents() {
    this.app.events.addListener(
      'onDetected',
      this.handleGmailDetected.bind(this),
    );
    this.app.events.addListener(
      'detectButton',
      this.handleDetectButton.bind(this),
    );
    this.app.events.addListener(
      'trelloUserAndBoardsReady',
      this.handleTrelloUserAndBoardsReady.bind(this),
    );
  }

  handleTrelloUserAndBoardsReady() {
    // Trello user data is now available, parse Gmail with proper fullName
    const user_k = this.app.persist.user || {};
    const fullName = user_k?.fullName || '';

    this.parsingData = false;
    this.app.model.gmail = this.parseData({ fullName });

    // Emit event that Gmail data is ready, passing the data
    this.app.events.emit('gmailDataReady', { gmail: this.app.model.gmail });
  }

  init() {
    this.bindEvents();
    // Start detection
    this.detect();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GmailView;
} else if (typeof window !== 'undefined') {
  // For browser usage, attach to global namespace
  window.GmailView = GmailView;
}

// Assign class to namespace
G2T.GmailView = GmailView;

// End, class_gmailview.js
