var Gmail2Trello = Gmail2Trello || {}; // must be var to guarantee correct scope

Gmail2Trello.GmailView = function (parent) {
  let self = this;

  this.parent = parent;

  this.LAYOUT_DEFAULT = 0;
  this.LAYOUT_SPLIT = 1;
  this.layoutMode = this.LAYOUT_DEFAULT;

  this.event = new EventTarget();
  this.data = null;

  this.$root = null;

  this.parsingData = false;

  this.runaway = 0;

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
};

Gmail2Trello.GmailView.prototype.preDetect = function () {
  var self = this;
  // g2t_log('GmailView:preDetect');

  var $activeGroup = $('.BltHke[role="main"]');

  /* // OBSOLETE (Ace, 2020-02-15): .find is always returning false, don't think detecting split needed any more
    if ($activeGroup.find('.apv, .apN').length > 0) { // .apv = old gmail, .apN = new gmail
        // g2t_log('detect: Detected SplitLayout');

        this.layoutMode = this.LAYOUT_SPLIT;
        this.$root = $activeGroup;
    } else {
*/
  this.layoutMode = this.LAYOUT_DEFAULT;
  this.$root = $('body');
  //  }

  return this.detectToolbar();
};

Gmail2Trello.GmailView.prototype.detect = function () {
  var self = this;
  // g2t_log('GmailView:detect');

  const pre_k = this.preDetect();

  if (pre_k) {
    self.event.fire('onDetected');
  } else {
    self.detectEmailOpeningMode();
  }
};

Gmail2Trello.GmailView.prototype.detectToolbar = function () {
  // g2t_log('GmailView:detectToolbar');
  var self = this;

  let $toolBar = $("[gh='mtb']", this.$root) || null;

  while ($($toolBar).children().length === 1) {
    $toolBar = $($toolBar).children().first();
  }

  this.$toolBar = $toolBar;

  const haveToolBar_k = $toolBar && $toolBar.length > 0;

  if (!haveToolBar_k) {
    setTimeout(function () {
      self.runaway++;
      if (self.runaway > 5) {
        self.runaway = 0;
        g2t_log('GmailView:detectToolbar RUNAWAY FIRED!');
      } else {
        self.event.fire('detectButton');
      }
    }, 2000);
  }

  self.runaway = 0;

  return haveToolBar_k;
};

Gmail2Trello.GmailView.prototype.detectEmailOpeningMode = function () {
  var self = this;
  this.$expandedEmails = this.$root.find('.h7'); // expandedEmails

  var result =
    this.$toolBar &&
    this.$toolBar.length > 0 &&
    this.$expandedEmails &&
    this.$expandedEmails.length > 0;
  if (result) {
    // g2t_log('detectEmailOpeningMode: Detected an email is opening: ' + JSON.stringify(this.$expandedEmails));

    //bind events
    var counter = 0;
    this.$root
      .find(
        '.kv:not([g2t_event]), .h7:not([g2t_event]), .kQ:not([g2t_event]), .kx:not([g2t_event])'
      )
      .each(function () {
        counter++;
        $(this)
          .attr('g2t_event', 1)
          .click(function () {
            WaitCounter.start('emailclick', 500, 5, function () {
              if (self.detectEmailOpeningMode()) {
                //this.event.fire('onEmailChanged');
                WaitCounter.stop('emailclick');
              }
            });
          });
      });
    g2t_log(
      'detectEmailOpeningMode: Binded email threads click events: ' +
        counter +
        ' items'
    );

    this.event.fire('onDetected');
  }
  return result;
};

Gmail2Trello.GmailView.prototype.parseData = function (args = {}) {
  // g2t_log('parseData');
  if (this.parsingData) {
    return;
  }

  let self = this;
  let data = {};

  const fullName_k = args?.fullName || '';

  const url_with_filename = function (url_in = '', var_in = '') {
    return self.parent.url_add_var(
      url_in,
      `${self.parent.UNIQUE_URI_VAR}=/${var_in}`
    );
  };

  /**
   * Format name and email with proper spacing and angle brackets
   * @param {string} name - The display name
   * @param {string} email - The email address
   * @returns {string} - Formatted string like "John Doe <john@example.com>"
   */
  const displayNameAndEmail = function (name = '', email = '') {
    return self.parent.addSpace(name, email.length > 0 ? `<${email}>` : '');
  };

  const email_raw_md = function (name = '', email = '') {
    let raw = '',
      md = '';
    if (!name.length && !email.length) {
      return {
        raw,
        md,
      };
    }

    // introduce a local variable instead of reassigning the `name` parameter
    let displayName = name;
    if (!name.length) {
      displayName = self.parent.splitEmailDomain(email).name || '';
    } else if (name.toUpperCase() === email.toUpperCase()) {
      // split out @domain when name and email match exactly
      displayName = self.parent.splitEmailDomain(name).name || name;
    }

    raw = displayNameAndEmail(displayName, email);

    if (displayName.length > 0) {
      if (email.length > 0) {
        md = `[${displayName}](${email})`;
      } else {
        md = displayName;
      }
    } else if (email.length > 0) {
      md = email;
    }

    return {
      raw,
      md,
    };
  };

  $viewport = $('.aia, .nH', this.$root).first();
  //  }
  // g2t_log('GmailView:parseData::viewport: ' + JSON.stringify($viewport));
  if ($viewport.length == 0) {
    return;
  }

  let y0 = $viewport.offset().top;
  //g2t_log(y0);
  let $visibleMail = null;
  // parse expanded emails again
  $('.h7', this.$root).each(function () {
    let $this = $(this);
    if ($visibleMail === null && $this.offset().top >= y0) $visibleMail = $this;
  });

  if (!$visibleMail) {
    return;
  }

  // Grab first email that's visible that we can find:
  const $email1_k = $('.adn.ads div.gs', $visibleMail).first();

  // Check for email body first. If we don't have this, then bail.
  const $emailBody1_k = $('.a3s.aiL', $email1_k).first();
  if (!$emailBody1_k) {
    g2t_log('GmailView:parseData::emailBody: ' + JSON.stringify($emailBody1_k));
    return;
  }

  this.parsingData = true;

  // email ccs which includes from name
  const $emailCC_k = $('span.g2', $email1_k);
  let me_email = '';
  let me_name = '';
  let emailCC = [];
  $emailCC_k.each(function () {
    const email = ($(this).attr('email') || '').trim();
    let name = ($(this).attr('name') || '').trim();
    // NOTE (Ace, 2021-01-04): Replacing NAME of "me" with Trello ID name (may want to confirm email match too?):
    if (name == 'me') {
      if (fullName_k.length > 0) {
        name = fullName_k;
      } else if (me_name.length > 0) {
        name = me_name;
      } else {
        me_email = email;
      }
    }
    if (email?.length > 0) {
      if (email == me_email && name !== 'me') {
        me_name = name;
      }
      emailCC.push({
        email,
        name,
      });
    }
  });

  // email name
  let $emailFromNameAddress_k = $('span.gD', $email1_k);
  let emailFromName = ($emailFromNameAddress_k.attr('name') || '').trim();
  let emailFromAddress = ($emailFromNameAddress_k.attr('email') || '').trim();
  if (
    me_name.length < 1 &&
    emailFromName.length > 0 &&
    emailFromAddress == me_email
  ) {
    // Try to correct "me" name if present:
    me_name = emailFromName;
  }

  // email attachments
  let emailAttachments = [];
  $('span.aZo', $email1_k).each(function () {
    const item_k = $(this).attr('download_url');
    if (item_k?.length > 0) {
      const attachment = item_k.match(/^([^:]+)\s*:\s*([^:]+)\s*:\s*(.+)$/);
      if (attachment && attachment.length > 3) {
        const name_k = self.parent.decodeEntities(attachment[2]); // was: decodeURIComponent
        const url_k = attachment[3]; // Was: self.parent.midTruncate(attachment[3], 50, '...');
        emailAttachments.push({
          mimeType: attachment[1],
          name: name_k,
          // NOTE (Ace@2017-04-20): Adding this explicitly at the end of the URL so it'll pick up the "filename":
          url: url_with_filename(url_k, name_k),
          checked: 'false',
        }); // [0] is the whole string
      }
    }
  });

  data.attachments = emailAttachments;

  // timestamp
  const $time_k = $('.gH .gK .g3', $email1_k).first();
  const timeAttr_k = (
    $time_k.length > 0
      ? $time_k.attr('title') || $time_k.text() || $time_k.attr('alt')
      : ''
  ).trim();

  /* Used to do this to convert to a true dateTime object, but there is too much hassle in doing so:
    const timeCorrected_k = self.parent.parseInternationalDateTime(timeAttr_k);
    const timeAsDate_k = (timeCorrected_k !== '' ? new Date (timeCorrected_k) : '');
    const timeAsDateInvalid_k = timeAsDate_k ? isNaN (timeAsDate_k.getTime()) : true;

    data.time = (timeAsDateInvalid_k ? 'recently' : timeAsDate_k.toString(this.dateFormat || 'MMM d, yyyy'));
    */

  data.time = timeAttr_k || 'recently';

  if (data.time === 'recently') {
    g2t_log(
      'time-debug: ' +
        JSON.stringify({
          timeAttr_k: timeAttr_k,
          /*
            'timeCorrected_k': timeCorrected_k,
            'timeAsDate_k': timeAsDate_k,
            'timeAsDateInvalid_k': timeAsDateInvalid_k,
            */
          time_k: $time_k,
        })
    );
  }

  let from_raw_md = email_raw_md(emailFromName, emailFromAddress);
  const from_raw = `From: ${self.parent.addSpace(from_raw_md.raw, data.time)}`;
  const from_md = `From: ${self.parent.addSpace(from_raw_md.md, data.time)}`;

  // subject
  let $subject = $('.hP', this.$root).first(); // Is above the primary first email, so grab it from root
  data.subject = ($subject.text() || '').trim();

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
    data.emailId = ($subject.attr(emailIDs_k[iter]) || '').trim(); // Try new Gmail format
  } while (!data.emailId && ++iter < ids_len_k);

  // OBSOLETE (Ace, 2021-02-27): Don't think this even exists any more:
  if (!data.emailId) {
    // try to find via explicitly named class item:
    var emailIdViaClass =
      $emailBody1_k[0].classList[$emailBody1_k.classList.length - 1];
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
  data.linkAsMd = `[${self.parent
    .anchorMarkdownify(txtAnchor, txtDirect, txtDirectComment)
    .trim()} | ${self.parent
    .anchorMarkdownify('time', txtSearch, 'Search by subject + time')
    .trim()}]\n`;

  // email body
  const make_preprocess_mailto = function (name, email) {
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

    let anchor_md = self.parent.anchorMarkdownify(name, email); // Don't need to add 'mailto:'

    let retn = {};

    g2t_each(forms, function (item) {
      let item1 = self.parent.replacer(item, dict);
      retn[item1.toLowerCase()] = anchor_md;
    });

    return retn;
  };

  let cc_raw = '',
    cc_md = '',
    a = make_preprocess_mailto(emailFromName, emailFromAddress),
    preprocess = {
      a,
    };

  $.each(emailCC, function (iter, item) {
    if (item.name == 'me') {
      // We didn't have your full name in time to replace it earlier, we'll try now:
      item.name = me_name || 'me';
    }
    $.extend(preprocess['a'], make_preprocess_mailto(item.name, item.email));
    let cc_raw_md = email_raw_md(item.name, item.email);
    if (cc_raw_md.raw.length > 0 || cc_raw_md.md.length > 0) {
      if (!cc_raw.length || !cc_md.length) {
        cc_raw = 'To: ';
        cc_md = 'To: ';
      } else {
        cc_raw += ', ';
        cc_md += ', ';
      }
      cc_raw += cc_raw_md.raw;
      cc_md += cc_raw_md.md;
    }
  });

  if (cc_raw.length > 0) {
    cc_raw += '\n';
  }
  if (cc_md.length > 0) {
    cc_md += '\n';
  }

  let selectedText = this.parent.getSelectedText();

  data.ccAsRaw = cc_raw;
  data.ccAsMd = cc_md;

  data.bodyAsRaw = `${from_raw}:\n\n${
    selectedText || this.parent.markdownify($emailBody1_k, false, preprocess)
  }`;
  data.bodyAsMd = `${from_md}:\n\n${
    selectedText || this.parent.markdownify($emailBody1_k, true, preprocess)
  }`;

  let emailImages = {};

  $('img', $emailBody1_k).each(function (index, value) {
    const href_k = ($(this).prop('src') || '').trim(); // Was attr
    const alt_k = $(this).prop('alt') || '';
    // <div id=":cb" class="T-I J-J5-Ji aQv T-I-ax7 L3 a5q" role="button" tabindex="0" aria-label="Download attachment Screen Shot 2020-02-05 at 6.04.37 PM.png" data-tooltip-class="a1V" data-tooltip="Download"><div class="aSK J-J5-Ji aYr"></div></div>}
    const $divs_k = $(this).nextAll("div[dir='ltr']"); // emailEmbedded
    const $div1_k = $divs_k.find('.T-I.J-J5-Ji.aQv.T-I-ax7.L3.a5q').first(); // emailEmbeddedTitle
    const aria_k = $div1_k.attr('aria-label') || ''; // emailEmbeddedNameAttr
    const aria_split_k = aria_k.split('Download attachment ');
    const aria_name_k = aria_split_k[aria_split_k.length - 1] || '';
    const name_k =
      (alt_k.length > aria_name_k.length ? alt_k : aria_name_k) ||
      self.parent.uriForDisplay(href_k) ||
      '';
    const display_k = self.parent.decodeEntities(
      self.parent.midTruncate(name_k.trim(), 50, '...')
    );
    const type_k = ($(this).prop('type') || 'text/link').trim(); // Was attr
    if (href_k.length > 0 && display_k.length > 0) {
      // Will store as key/value pairs to automatically overide duplicates
      emailImages[href_k] = {
        mimeType: type_k,
        name: display_k,
        url: url_with_filename(href_k, name_k),
        checked: 'false',
      };
    }
  });

  data.images = Object.values(emailImages);

  //var t = (new Date()).getTime();
  //g2t_log('Elapsed: '+(t-startTime)/1000);
  this.parsingData = false;

  return data;
};
