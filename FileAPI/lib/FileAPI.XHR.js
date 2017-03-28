/*global window, FileAPI, Uint8Array */

(function(window, api) {
  'use strict';

  var 
    noop = function() {},
    document = window.document,

    XHR = function(options) {
      this.uid = api.uid();
      this.xhr = {
        abort: noop,
        getResponseHeader: noop,
        getAllResponseHeaders: noop
      };

      this.options = options;
    },

    _xhrResponsePostfix = {'': 1, XML: 1, Text: 1, Body: 1}
  ;

  XHR.prototype = {
    status: 0,
    statusText: '',
    constructor: XHR,

    getResponseHeader: function(name) {
      return this.xhr.getResponseHeader(name);
    },

    getAllResponseHeaders: function() {
      return this.xhr.getAllResponseHeaders() || {};
    },

    end: function(status, statusText) {
      var _this = this, options = _this.options;
    }
  }


  // @export
  api.XHR = XHR;

})(window, FileAPI);