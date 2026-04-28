(function () {
  if (window.g2tTrustedTypesPolicy) return;
  if (!(window.trustedTypes && window.trustedTypes.createPolicy)) {
    window.g2tTrustedTypesPolicy = { createHTML: s => s };
  } else {
    try {
      window.g2tTrustedTypesPolicy = window.trustedTypes.createPolicy(
        'g2t-gmail-html',
        {
          createHTML: s => s,
          createScript: s => s,
          createScriptURL: s => s,
        },
      );
    } catch (_e) {
      window.g2tTrustedTypesPolicy = { createHTML: s => s };
    }
  }

  function hookJqueryWhenReady() {
    if (typeof jQuery === 'undefined') return false;
    if (jQuery.__g2tHtmlPrefilterHooked) return true;
    const inner = jQuery.htmlPrefilter;
    const policy = window.g2tTrustedTypesPolicy;
    jQuery.htmlPrefilter = function (html) {
      return policy.createHTML(inner ? inner(html) : html);
    };
    jQuery.__g2tHtmlPrefilterHooked = true;
    return true;
  }
  if (!hookJqueryWhenReady()) {
    const t = setInterval(() => {
      if (hookJqueryWhenReady()) clearInterval(t);
    }, 50);
    setTimeout(() => clearInterval(t), 30000);
  }
})();
