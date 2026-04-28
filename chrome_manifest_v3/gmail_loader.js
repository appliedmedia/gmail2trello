// Runs in page context (world: "MAIN"), loaded via manifest.json
// Bridges gmail.js events to content script via CustomEvent
(function () {
  let policy;
  if (window.trustedTypes && window.trustedTypes.createPolicy) {
    try {
      policy = window.trustedTypes.createPolicy('g2t-gmail-html', {
        createHTML: s => s,
        createScript: s => s,
        createScriptURL: s => s,
      });
    } catch (_e) {
      policy = { createHTML: s => s };
    }
  } else {
    policy = { createHTML: s => s };
  }
  window.g2tTrustedTypesPolicy = policy;

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

        const emit = (type, data = {}) => {
          document.dispatchEvent(
            new CustomEvent('g2t_gmail_event', {
              detail: { type, ...data },
            }),
          );
        };

        // Wait for Gmail to fully load before emitting ready
        // (user_email and GLOBALS are not available until the load event)
        gmail.observe.on('load', () => {
          emit('ready', { userEmail: gmail.get.user_email() });
          emit('load');
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
      } catch (_e) {
        // Gmail.js failed -- interval continues to retry
      }
    }
  }, 100);

  // Give up after 30 seconds
  setTimeout(() => clearInterval(waitForGmail), 30000);
})();
