/**
 * MenuControl - ES6 Class Version
 * @depend class_eventtarget.js
 */

var G2T = G2T || {}; // must be var to guarantee correct scope - do not alter this line

class MenuControl {
  constructor(args) {
    this.app = args.app;
    this.controller = new AbortController();
  }

  static get ck() {
    // class keys here to assure they're treated like consts
    const ck = {
      id: 'g2t_menuControl',
    };
    return ck;
  }

  get ck() {
    return MenuControl.ck;
  }

  reset(args = {}) {
    const { selectors, nonexclusive = false } = args;

    if (!selectors) {
      this.app.utils.log('MenuControl: missing required selectors');
      return;
    }

    // Abort any previously registered listeners before re-binding
    this.controller.abort();
    this.controller = new AbortController();

    // Guard against non-string selectors (querySelectorAll requires a string)
    if (typeof selectors !== 'string') {
      this.items = [];
      this.nonexclusive = nonexclusive;
      return;
    }

    this.items = document.querySelectorAll(selectors);
    this.nonexclusive = nonexclusive;

    for (let i = 0; i < this.items.length; i++) {
      this.items[i].menuIndex = i;
    }

    this.bindEvents();
    // Legacy compat shim: allow instanceof checks expecting items.click to exist
    if (!this.items.click) {
      this.items.click = () => {};
    }
  }

  bindEvents() {
    const { signal } = this.controller;
    // Bind click events
    for (const item of this.items) {
      item.addEventListener(
        'click',
        evt => {
          const newIndex = evt.currentTarget.menuIndex;

          if (this.nonexclusive === true) {
            evt.currentTarget.classList.toggle('active');
          } else {
            evt.currentTarget.classList.add('active');
            for (const sib of evt.currentTarget.parentElement.children) {
              if (sib !== evt.currentTarget) sib.classList.remove('active');
            }
          }

          this.app.events.emit('menuClick', {
            target: evt.currentTarget,
            index: newIndex,
          });
        },
        { signal },
      );
    }
  }
}

// Assign class to namespace
G2T.MenuControl = MenuControl;

// End, class_menuControl.js
