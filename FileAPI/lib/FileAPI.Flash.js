/**
 * FileAPI fallback to Flash
 *
 * @flash-developer  "Vladimir Demidov" <v.demidov@corp.mail.ru>
 */

/*global window, ActiveXObject, FileAPI */

(function(window, jQuery, api) {
  'use strict';

  var 
    document = window.document,
    location = window.location,
    navigator = window.navigator,
    _each = api._each
  ;

  api.support.flash = (function() {
    var mime = navigator.mimeTypes, has = false;

    if (navigator.plugins && typeof navigator.plugins['Shockwave Flash'] == 'object') {
      has = navigator.plugins['Shockwave Flash'].description && !(mime && mime['application/x-shockwave-flash'] && !mime['application/x-shockwave-flash'].enabledPlugin);
    } else {
      try{
        has = !!(window.ActiveXObject && new ActiveXObject('ShockwaveFlash.ShockwaveFlash'));
        
      } catch(er) {
        api.log('Flash -- does not supported.');
      }
    }

    if (has && /^file:/i.test(location)) {
      api.log('[warn] Flash does not work on `file:` protocol.');
    }

    return has;
  })();

})(window, window.jQuery, FileAPI);