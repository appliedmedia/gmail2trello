// Runs in page context (world: "MAIN"), loaded via manifest.json
// Bridges gmail.js events to content script via CustomEvent
(function () {
  const waitForGmail = setInterval(() => {
    if (typeof Gmail !== 'undefined') {
      clearInterval(waitForGmail);
      const gmail = new Gmail();

      const emit = (type, data = {}) => {
        document.dispatchEvent(
          new CustomEvent('g2t_gmail_event', {
            detail: { type, ...data },
          }),
        );
      };

      gmail.observe.on('load', () => emit('load'));
      gmail.observe.on('view_email', () =>
        emit('view_email', {
          page: gmail.get.current_page(),
          subject: gmail.get.email_subject(),
        }),
      );
      gmail.observe.on('open_email', () => emit('open_email'));

      // Signal ready with user email (replaces inject.js GLOBALS hack)
      emit('ready', { userEmail: gmail.get.user_email() });
    }
  }, 100);

  // Give up after 30 seconds
  setTimeout(() => clearInterval(waitForGmail), 30000);
})();
