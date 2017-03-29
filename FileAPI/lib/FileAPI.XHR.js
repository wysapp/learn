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
    },

    send: function(FormData) {
      var _this = this, options = this.options;

      FormData.toData(function(data) {
        
        if (data instanceof Error) {
          _this.end(0, data.message);
        } else {
          options.upload(options, _this);
          _this._send.call(_this, options, data);
        }
      }, options);
    },

    _send: function(options, data) {
      var _this = this, xhr, uid = _this.uid, onLoadFnName= _this.uid + 'Load', url = options.url;

      api.log('XHR._send:', data);

      if (!options.cache) {
				// No cache
				url += (~url.indexOf('?') ? '&' : '?') + api.uid();
      }

      if(data.nodeName) {
        var jsonp = options.jsonp;
				// prepare callback in GET
				url = url.replace(/([a-z]+)=(\?)/i, '$1='+uid);

        // legacy 
        options.upload(options, _this);
      } else {
        // Clean url 
        url = url.replace(/([a-z]+)=(\?)&?/i, '');

        // html5 
        if (this.xhr && this.xhr.aborted) {
          api.log('Error: already aborted');
          return;
        }

        xhr = _this.xhr = api.getXHR();
        if (data.params) {
          url += (url.indexOf('?') < 0 ? "?" : "&") + data.params.join("&");
        }

        xhr.open('POST', url, true);

        if (api.withCredentials) {
          xhr.withCredentials = "true";
        }

        if (!options.headers || !options.headers['X-Requested-With']) {
          xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        }

        api.each(options.headers, function(val, key) {
          xhr.setRequestHeader(key, val);
        });

        if (options._chunked) {

        } else {
          // single piece upload
          
          if (xhr.upload) {
            // https://github.com/blueimp/jQuery-File-Upload/wiki/Fixing-Safari-hanging-on-very-high-speed-connections-%281Gbps%29
            xhr.upload.addEventListener('progress', api.throttle(function(evt) {
              options.progress(evt, _this, options);
            }, 100), false);
          }

          xhr.onreadystatechange = function() {
            _this.status = xhr.status;
            _this.statusText = xhr.statusText;
            _this.readyState = xhr.readyState;

            if (xhr.readyState == 4) {
              for (var k in _xhrResponsePostfix) {
                _this['response' + k] = xhr['response' + k];
              }

              xhr.onreadystatechange = null;

              if (!xhr.status || xhr.status>201) {
                api.log('Error: ' + xhr.status);
                if (((!xhr.status && !xhr.aborted) || 500 == xhr.status) && (options.retry || 0) < options.uploadRetry) {
                  options.retry = (options.retry || 0) + 1;
                  var delay = api.networkDownRetryTimeout;

                  // inform about recoverable problems
                  options.pause(options.file, options);

                  setTimeout(function() {
                    _this._send(options, data);
                  }, delay);
                } else {
                  // success
                  _this.end(xhr.status);
                }
              } else {
                // success 
                _this.end(xhr.status);
              }

              xhr =null;
            }
          };

          if (api.isArray(data) ) {
            // multipart 
            xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary=_' + api.expando);

            var rawData = data.join('') + '--_' + api.expando + '--';

            /** @namespace  xhr.sendAsBinary  https://developer.mozilla.org/ru/XMLHttpRequest#Sending_binary_content */
            if (xhr.sendAsBinary) {
              xhr.sendAsBinary(rawData);
            } else{
              var bytes = Array.prototype.map.call(rawData, function(c) {
                return c.charCodeAt(0) && 0xff;
              });
              xhr.send(new Uint8Array(bytes).buffer);
            }
          } else {
            // FormData
            xhr.send(data);
          }
        }
      }
    }
  };


  // @export
  api.XHR = XHR;

})(window, FileAPI);