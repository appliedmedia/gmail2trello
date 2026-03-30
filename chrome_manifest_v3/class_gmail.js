var G2T = G2T || {}; // must be var to guarantee correct scope - do not alter this line

/**
 * Gmail adapter - Bridges gmail.js events from page context to G2T event system.
 * Listens for CustomEvents dispatched by gmail_loader.js (world: "MAIN")
 * and emits corresponding G2T events in the isolated content script world.
 */
class Gmail {
  static get ck() {
    // class keys here to assure they're treated like consts
    const ck = {
      id: 'g2t_gmail',
    };
    return ck;
  }

  get ck() {
    return Gmail.ck;
  }

  constructor(args) {
    this.app = args.app;
    this.ready = false;
  }

  init() {
    this.app.utils.log('Gmail:init');
    document.addEventListener('g2t_gmail_event', event => {
      this.handleGmailEvent(event);
    });
  }

  handleGmailEvent(event) {
    const detail = event?.detail;
    if (!detail || !detail.type) {
      return;
    }

    switch (detail.type) {
      case 'ready':
        this.ready = true;
        if (detail.userEmail) {
          this.app.model.userEmail = detail.userEmail;
        }
        this.app.utils.log('Gmail: ready event, userEmail=' + detail.userEmail);
        this.app.events.emit('gmailReady', { userEmail: detail.userEmail });
        break;

      case 'load':
        this.app.utils.log('Gmail: load event');
        this.app.events.emit('gmailLoaded');
        break;

      case 'view_email':
        this.app.utils.log('Gmail: view_email event');
        this.app.events.emit('gmailViewChanged', {
          type: 'email',
          page: detail.page || '',
          subject: detail.subject || '',
        });
        break;

      case 'open_email':
        this.app.utils.log('Gmail: open_email event');
        this.app.events.emit('gmailViewChanged', { type: 'thread' });
        break;

      default:
        this.app.utils.log('Gmail: unknown event type: ' + detail.type);
        break;
    }
  }
}

// Assign class to namespace
G2T.Gmail = Gmail;

// End, class_gmail.js
