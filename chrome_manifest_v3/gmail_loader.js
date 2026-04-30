// Runs in page context (world: "MAIN"), loaded via manifest.json
// Bridges gmail.js events to content script via CustomEvent
(function () {
  const TAG = '[g2t-loader]';
  console.info(TAG, 'startup');

  let policy;
  if (window.trustedTypes && window.trustedTypes.createPolicy) {
    try {
      policy = window.trustedTypes.createPolicy('g2t-gmail-html', {
        createHTML: s => s,
        createScript: s => s,
        createScriptURL: s => s,
      });
    } catch (e) {
      console.warn(
        TAG,
        'TT policy createPolicy threw, falling back to passthrough:',
        e,
      );
      policy = { createHTML: s => s };
    }
  } else {
    policy = { createHTML: s => s };
  }
  window.g2tTrustedTypesPolicy = policy;

  // Cache the once-fired bootstrap signals so a late-registering
  // ISOLATED-world listener can request a replay and not miss them.
  const cached = { ready: null, load: null };

  const dispatch = detail => {
    document.dispatchEvent(
      new CustomEvent('g2t_gmail_event', { detail }),
    );
  };

  const emit = (type, data = {}) => {
    const detail = { type, ...data };
    if (type === 'ready' || type === 'load') {
      cached[type] = detail;
    }
    dispatch(detail);
  };

  document.addEventListener('g2t_gmail_request_replay', () => {
    console.info(TAG, 'replay requested; cached:', {
      ready: !!cached.ready,
      load: !!cached.load,
    });
    if (cached.ready) dispatch(cached.ready);
    if (cached.load) dispatch(cached.load);
  });

  let setupComplete = false;
  const waitForGmail = setInterval(() => {
    if (typeof Gmail !== 'undefined' && typeof jQuery !== 'undefined') {
      try {
        if (jQuery.htmlPrefilter && !jQuery.__g2tHtmlPrefilterHooked) {
          const inner = jQuery.htmlPrefilter;
          jQuery.htmlPrefilter = function (html) {
            return policy.createHTML(inner ? inner(html) : html);
          };
          jQuery.__g2tHtmlPrefilterHooked = true;
        }

        const gmail = new Gmail(jQuery);

        // Wait for Gmail to fully load before emitting ready
        // (user_email and GLOBALS are not available until the load event)
        gmail.observe.on('load', () => {
          console.info(TAG, 'gmail.js load fired');
          emit('ready', { userEmail: gmail.get.user_email() });
          emit('load');
          document.documentElement.dataset.g2tGmailReady = '1';
        });

        gmail.observe.on('view_email', () =>
          emit('view_email', {
            page: gmail.get.current_page(),
            subject: gmail.get.email_subject(),
          }),
        );
        gmail.observe.on('open_email', () => emit('open_email'));

        // Only clear interval after successful setup
        clearInterval(waitForGmail);
        setupComplete = true;
        console.info(
          TAG,
          'gmail.js subscribed; load/view_email/open_email wired',
        );
      } catch (e) {
        console.warn(TAG, 'gmail.js init threw, will retry:', e);
      }
    }
  }, 100);

  // Give up after 30 seconds
  setTimeout(() => {
    clearInterval(waitForGmail);
    if (!setupComplete) {
      console.warn(
        TAG,
        'timed out waiting 30s for Gmail+jQuery; bootstrap aborted',
      );
    }
  }, 30000);
})();
