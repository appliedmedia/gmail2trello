// Runs in page context (world: "MAIN"), loaded via manifest.json
// Bridges gmail.js events to content script via CustomEvent
(function () {
  const waitForGmail = setInterval(() => {
    if (typeof Gmail !== 'undefined' && typeof jQuery !== 'undefined') {
      try {
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
