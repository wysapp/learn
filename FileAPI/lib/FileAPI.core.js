/*jslint evil: true */
/*global window, URL, webkitURL, ActiveXObject */


(function(window, undef) {
  'use strict';

  var
    gid = 1,
    noop = function() {},

    document = window.document,
    doctype = document.doctype || {},
    userAgent = window.navigator.userAgent,
    safari = /safari\//i.test(userAgent) && !/chrome\//i.test(userAgent),
    iemobile = /iemobile\//i.test(userAgent),
    insecureChrome = !safari && /chrome\//i.test(userAgent) && window.location.protocol === 'http:',


    // https://github.com/blueimp/JavaScript-Load-Image/blob/master/load-image.js#L48
    apiURL = (window.createObjectURL && window) || (window.URL && URL.revokeObjectURL && URL) || (window.webkitURL && webkitURL),

    Blob = window.Blob,
    File = window.File,
    FileReader = window.FileReader,
    FormData = window.FormData,

    XMLHttpRequest = window.XMLHttpRequest,
    jQuery = window.jQuery,

    html5 = !!(File && (FileReader && (window.Uint8Array || FormData || XMLHttpRequest.prototype.sendAsBinary))) && !(safari && /windows/i.test(userAgent) && !iemobile), // BugFix: https://github.com/mailru/FileAPI/issues/25

    cors = html5 && ('withCredentials' in (new XMLHttpRequest)),

    chunked = html5 && !!Blob && !!(Blob.prototype.webkitSlice || Blob.prototype.mozSlice || Blob.prototype.slice),

    normalize = ('' + ''.normalize).indexOf('[native code]') > 0,

    dataURLtoBlob = window.dataURLtoBlob,

    _rimg = /img/i,
    _rcanvas = /canvas/i,
    _rimgcanvas = /img|canvas/i,
    _rinput = /input/i,
    _rdata = /^data:[^,]+,/i,



    _toString = {}.toString,
    _supportConsoleLog,
    _supportConsoleLogApply,

    Math = window.Math,

    _SIZE_CONST = function(pow) {
      pow = new window.Number(Math.pow(1024, pow));
      pow.from = function(sz) { return Math.round(sz * this ); };
      return pow;
    },

    _elEvents = {},   // element event listeners
    _infoReader = [],   // list of file info processors

    _readerEvents = 'abort progress error load loadend',
    _xhrPropsExport = 'status statusText readyState response responseXML responseText responseBody'.split(' '),

    currentTarget = 'currentTarget',
    preventDefault = 'preventDefault',


    _isArray = function(ar) {
      return ar && ('length' in ar);
    },

    _each = function(obj, fn, ctx) {
      if (obj) {
        if (_isArray(obj)) {
          for (var i = 0, n = obj.length; i < n; i++) {
            if (i in obj) {
              fn.call(ctx, obj[i], i, obj);
            }
          }
        } else {
          for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
              fn.call(ctx, obj[key], key, obj);
            }
          }
        }
      }
    },


    _extend = function(dst) {
      var args = arguments, i = 1, _ext = function(val, key) { dst[key] = val;};
      for (; i < args.length; i++) {
        _each(args[i], _ext);
      }

      return dst;
    },


    _on = function(el, type, fn){
      if (el) {
        var uid = api.uid(el);
        if (!_elEvents[uid]) {
          _elEvents[uid ] = {};
        }

        var isFileReader = (FileReader && el) && ( el instanceof FileReader);

        _each(type.split(/\s+/), function(type) {
          if (jQuery && !isFileReader) {
            jQuery.event.add(el, type, fn);
          } else {
            if (!_elEvents[uid][type]) {
              _elEvents[uid][type] = [];
            }

            _elEvents[uid][type].push(fn);

            if (el.addEventListener) { 
              el.addEventListener(type, fn, false); 
            } else if (el.attachEvent) {
              el.attachEvent('on' + type, fn);
            } else {
              el['on' + type] = fn;
            }
          }
        });
      }
    },

    _off = function(el, type, fn) {
      if ( el ) {
        var uid = api.uid(el), events = _elEvents[uid] || {};

        var isFileReader = (FileReader && el) && (el instanceof FileReader);
        _each(type.split(/\s+/), function(type) {
          if (jQuery && !isFileReader) {
            jQuery.event.remove(el, type, fn);
          } else {
            var fns = events[type] || [], i = fns.length;

            while(i--) {
              if (fns[i] === fn) {
                fns.splice(i, 1);
                break;
              }
            }

            if (el.addEventListener) { 
              el.removeEventListener(type, fn, false); 
            } else if (el.detachEvent) {
              el.detachEvent('on' + type, fn);
            } else {
              el['on' + type] = null;
            }
          }
        });
      }
    },

    _one = function(el, type, fn) {
      _on(el, type, function _(evt) {
        _off(el, type, _);
        fn(evt);
      });
    },

    _fixEvent = function(evt) {
      if (!evt.target) { evt.target = window.event && window.event.srcElement || document; }

      if (evt.target.nodeType === 3) { evt.target = evt.target.parentNode; }

      return evt;
    },


    _supportInputAttr = function(attr) {
      var input = document.createElement('input');
      input.setAttribute('type', 'file');
      return attr in input;
    },


    api = {
      version: '2.0.21',
      cors: false,
      html5: true,
      media: false,
      formData: true,
      multiPassResize: true,
      insecureChrome: insecureChrome,

      debug: false,
      pingUrl: false,
      multiFlash: false,
      fashAbortTimeout: 0,
      withCredentials: true,

      staticPath: './dist/',

			flashUrl: 0, // @default: './FileAPI.flash.swf'
			flashImageUrl: 0, // @default: './FileAPI.flash.image.swf'

      postNameConcat: function (name, idx){
				return	name + (idx != null ? '['+ idx +']' : '');
			},

			ext2mime: {
				  jpg:	'image/jpeg'
				, tif:	'image/tiff'
				, txt:	'text/plain'
			},

			// Fallback for flash
			accept: {
				  'image/*': 'art bm bmp dwg dxf cbr cbz fif fpx gif ico iefs jfif jpe jpeg jpg jps jut mcf nap nif pbm pcx pgm pict pm png pnm qif qtif ras rast rf rp svf tga tif tiff xbm xbm xpm xwd'
				, 'audio/*': 'm4a flac aac rm mpa wav wma ogg mp3 mp2 m3u mod amf dmf dsm far gdm imf it m15 med okt s3m stm sfx ult uni xm sid ac3 dts cue aif aiff wpl ape mac mpc mpp shn wv nsf spc gym adplug adx dsp adp ymf ast afc hps xs'
				, 'video/*': 'm4v 3gp nsv ts ty strm rm rmvb m3u ifo mov qt divx xvid bivx vob nrg img iso pva wmv asf asx ogm m2v avi bin dat dvr-ms mpg mpeg mp4 mkv avc vp3 svq3 nuv viv dv fli flv wpl'
			},

      uploadRetry: 0,
      networkDownRetryTimeout: 5000,

      chunkSize:0,
      chunkUploadRetry: 0,
      chunkNetworkDownRetryTimeout: 2000,

      KB: _SIZE_CONST(1),
      MB: _SIZE_CONST(2),
      GB: _SIZE_CONST(3),
      TB: _SIZE_CONST(4),

      EMPTY_PNG: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NkAAIAAAoAAggA9GkAAAAASUVORK5CYII=',

      expando: 'fileapi' + (new Date).getTime(),

      uid: function(obj) {
        return obj 
          ? (obj[api.expando] = obj[api.expando] || api.uid()) 
          : (++gid, api.expando + gid)
        ;
      },

      log: function() {
        if (api.debug && _supportConsoleLog) {
          if (_supportConsoleLogApply) {
            console.log.apply(console, arguments);
          } else {
            console.log([].join.call(arguments, ' '));
          }
        }
      },

      newImage: function(src, fn) {
        var img = document.createElement('img');
        if (fn) {
          api.event.one(img, 'error load', function(evt) {
            fn(evt.type == 'error', img);
            img = null;
          });
        }

        img.src = src;
        return img;
      },

      getXHR: function() {
        var xhr;

        if (XMLHttpRequest) {
          xhr = new XMLHttpRequest;
        } else if ( window.ActiveXObject ) {
          try {
            xhr = new ActiveXObject('MSXML2.XMLHttp.3.0');
          } catch (e) {
            xhr = new ActiveXObject('Microsoft.XMLHTTP');
          }
        }

        return xhr;
      },

      isArray: _isArray,

      support: {
        dnd: cors && ('ondrop' in document.createElement('div')),
        cors: cors,
        html5: html5,
        chunked: chunked,
        dataURI: true,
        accept: _supportInputAttr('accept'),
        multiple: _supportInputAttr('multiple')
      },

      event: {
        on: _on,
        off: _off,
        one: _one,
        fix: _fixEvent
      },

      throttle: function(fn, delay) {
        var id, args;

        return function _throttle() {
          args = arguments;

          if (!id) {
            fn.apply(window, args);
            id = setTimeout(function() {
              id = 0;
              fn.apply(window, args);
            }, delay);
          }
        };
      },

      F: function() {},


      trim: function(str) {
        str = String(str);
        return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
      },


      queue: function(fn) {
        var 
          _idx = 0,
          _length = 0,
          _fail = false,
          _end = false,
          queue = {
            inc: function() {
              _length++;
            },
            next: function() {
              _idx++;
              setTimeout(queue.check, 0);
            },

            check: function() {
              (_idx >= _length) && !_fail && queue.end();
            },

            isFail: function() {
              return _fail;
            },

            fail: function() {
              !_fail && fn(_fail = true)
            },

            end: function() {
              if (!_end) {
                _end = true;
                fn();
              }
            }
          }
        ;

        return queue;
      },


      each: _each,


      extend: _extend,


      isFile: function(file) {
        return _toString.call(file) === '[object File]';
      },

      isBlob: function(blob) {
        return this.isFile(blob) || (_toString.call(blob) === '[object Blob]');
      },

      isCanvas: function(el) {
        return el && _rcanvas.test(el.nodeName);
      },


      readAsImage: function (file, fn, progress){

				if( api.isBlob(file) ){
					if( apiURL ){
						/** @namespace apiURL.createObjectURL */
						var data = apiURL.createObjectURL(file);
						if( data === undef ){
							_emit(file, fn, 'error');
						}
						else {
							api.readAsImage(data, fn, progress);
						}
					}
					else {
						api.readAsDataURL(file, function (evt){
							if( evt.type == 'load' ){
								api.readAsImage(evt.result, fn, progress);
							}
							else if( progress || evt.type == 'error' ){
								_emit(file, fn, evt, null, { loaded: evt.loaded, total: evt.total });
							}
						});
					}
				}
				else if( api.isCanvas(file) ){
					_emit(file, fn, 'load', file);
				}
				else if( _rimg.test(file.nodeName) ){
					if( file.complete ){
						_emit(file, fn, 'load', file);
					}
					else {
						var events = 'error abort load';
						_one(file, events, function _fn(evt){
							if( evt.type == 'load' && apiURL ){
								/** @namespace apiURL.revokeObjectURL */
								apiURL.revokeObjectURL(file.src);
							}

							_off(file, events, _fn);
							_emit(file, fn, evt, file);
						});
					}
				}
				else if( file.iframe ){
					_emit(file, fn, { type: 'error' });
				}
				else {
					// Created image
					var img = api.newImage(file.dataURL || file);
					api.readAsImage(img, fn, progress);
				}
			},


      getFiles: function(input, filter, callback) {
        var files = [];
        if (callback) {
          api.filterFiles(api.getFiles(input), filter, callback);
          return null;
        }

        if (input.jquery) {
          // jQuery object
          input.each(function() {
            files = files.concat(api.getFiles(this));
          });
          input = files;
          files = [];
        }

        if (typeof filter == 'string') {
          filter = api.getFilesFilter(filter);
        }

        if (input.originalEvent) {
          // jQuery event 
          input = _fixEvent(input.originalEvent);
          
        } else if (input.srcElement) {
          // IE Event 
          input = _fixEvent(input);
        }

        if (input.dataTransfer) {
          // Drag 'n' Drop 
          input = input.dataTransfer;
        } else if (input.target) {
          // Event 
          input = input.target;
        }

        if (input.files) {
          // Input[type="file"]
          files = input.files;

          if (!html5) {
            files[0].blob = input;
            files[0].iframe = true;
          }
        } else if (!html5 && isInputFile(input)) {
          if (api.trim(input.value)) {
            files = [api.checkFileObj(input.value)];
            files[0].blob = input;
            files[0].iframe = true;
          }
        } else if (_isArray(input)) {
          files = input;
        }

        return api.filter(files, function(file) { return !filter || filter.test(file.name); });
      },


      getInfo: function(file, fn) {
        var info = {}, readers = _infoReader.concat();
        
        if (api.isBlob(file)) {
          (function _next() {
            var reader = readers.shift();

            if (reader) {
              if (reader.test(file.type)) {
                reader(file, function(err, res) {
                  if (err){
                    fn(err);
                  } else {
                    _extend(info, res);
                    _next();
                  }
                });
              } else {
                _next();
              }
            } else {
              fn(false, info);
            }
          })();
        } else {
          fn('not_support_info', info);
        }
      },

      filter: function(input, fn) {
        var result = [], i = 0, n = input.length, val;

        for (; i < n; i++) {
          if (i in input) {
            val = input[i];
            if (fn.call(val, val, i, input)) {
              result.push(val);
            }
          }
        }

        return result;
      },


      upload: function(options) {
        options = _extend({
          jsonp: 'callback',
          prepare: api.F,
          beforeupload: api.F,
          upload: api.F,
          fileupload: api.F,
          fileprogress: api.F,
          filecomplete: api.F,
          progress: api.F,
          complete: api.F,
          pause: api.F,
          imageOriginal: true,
          chunkSize: api.chunkSize,
          chunkUploadRetry: api.chunkUploadRetry,
          uploadRetry: api.uploadRetry
        }, options);

        if (options.imageAutoOrientation && !options.imageTransform) {
          options.imageTransform = { rotate: 'auto'};
        }

        var 
          proxyXHR = new api.XHR(options),
          dataArray = this._getFilesDataArray(options.files),
          _this = this,
          _total = 0,
          _loaded = 0,
          _nextFile,
          _complete = false 
        ;

        console.log('ssssssssssssssssssssss', proxyXHR);

        _each(dataArray, function(data) {
          _total += data.size;
        });

        proxyXHR.files = [];
        _each(dataArray, function(data) {
          proxyXHR.files.push(data.file);
        });

        proxyXHR.total = _total;
        proxyXHR.loaded = 0;
        proxyXHR.filesLeft = dataArray.length;

        // Upload "beforeupload" event
        options.beforeupload(proxyXHR, options);

        // Upload by file 
        _nextFile = function() {
          var 
            data = dataArray.shift(),
            _file = data && data.file,
            _fileLoaded = false,
            _fileOptions = _simpleClone(options)
          ;

          proxyXHR.filesLeft = dataArray.length;

          if (_file && _file.name === api.expando) {
            _file = null;
            api.log('[warn] FileAPI.upload() - called without files');
          }

          if ((proxyXHR.statusText != 'abort' || proxyXHR.current) && data) {

            _complete = false;
            proxyXHR.currentFile = _file;

            if(_file && options.prepare(_file, _fileOptions) === false) {
              _nextFile.call(_this);
              return;
            }

            _fileOptions.file = _file;

            _this._getFormData(_fileOptions, data, function(form) {
              if (!_loaded) {
                // emit "upload" event 
                options.upload(proxyXHR, options);
              }

              var xhr = new api.XHR(_extend({}, _fileOptions, {
                upload: _file ? function() {
                  // emit fileupload event 
                  options.fileupload(_file, xhr, _fileOptions);
                } : noop,

                progress: _file ? function(evt) {
                  if (!_fileLoaded) {
                    _fileLoaded = (evt.loaded === evt.total);

                    options.fileprogress({
                      type: 'progress',
                      total: data.total = evt.total,
                      loaded: data.loaded = evt.loaded
                    }, _file, xhr, _fileOptions);

                    // emit progress event 
                    options.progress({
                      type: 'progress',
                      total: _total,
                      loaded: proxyXHR.loaded = (_loaded + data.size * (evt.loaded/evt.total)) || 0
                    }, _file, xhr, _fileOptions);
                  }
                } : noop,

                complete: function(err) {
                  _each(_xhrPropsExport, function(name) {
                    proxyXHR[name] = xhr[name];
                  });

                  if (_file) {
                    data.total = (data.total || data.size);
                    data.loaded = data.total;

                    if (!err) {
                      this.progress(data);

                      _fileLoaded = true;

                      _loaded += data.size; // data.size != data.total, its desirable fix this
                      proxyXHR.loaded = _loaded;
                    }

                    // emit filecomplete event 
                    options.filecomplete(err, xhr, _file, _fileOptions);
                  }

                  // upload next file 
                  setTimeout(function() {_nextFile.call(_this);}, 0);
                }

              })); //xhr

              proxyXHR.abort = function(current) {
                if (!current) { dataArray.length = 0; }
                this.current = current;
                xhr.abort();
              };

              // start upload
              xhr.send(form);
            });
          } else {
            var successful = proxyXHR.status == 200 || proxyXHR.status == 201 || proxyXHR.status == 204;
            options.complete(successful ? false : (proxyXHR.statusText || 'error'), proxyXHR, options);

            // Mark done state 
            _complete = true;
          }

        };

        // Next tick
        setTimeout(_nextFile, 0);
        
        // Append more files to the existing request
				// first - add them to the queue head/tail
        proxyXHR.append = function(files, first) {
          files = api._getFilesDataArray([].concat(files));

          _each(files, function(data) {
            _total += data.size;
            proxyXHR.files.push(data.file);
            if (first) {
              dataArray.unshift(data);
            } else {
              dataArray.push(data);
            }
          });

          proxyXHR.statusText = '';

          if (_complete) {
            _nextFile.call(_this);
          }
        };

        // Removes file from queue by file reference and returns it
        proxyXHR.remove = function(file) {
          var i = dataArray.length,  _file;

          while(i--) {
            if(dataArray[i].file == file) {
              _file = dataArray.splice(i, 1);
              _total -= _file.size;
            }
          }
          return _file;
        };

        return proxyXHR;

      },


      _getFilesDataArray: function(data) {
        var files = [], oFiles = {};

        if (isInputFile(data)) {
          var tmp = api.getFiles(data);

          oFiles[data.name || 'file'] = data.getAttribute('multiple') !== null ? tmp : tmp[0];
        } else if (_isArray(data) && isInputFile(data[0])) {
          _each(data, function(input) {
            oFiles[input.name || 'file'] = api.getFiles(input);
          });
        } else {
          oFiles = data;
        }

        _each(oFiles, function add(file, name) {
          
          if (_isArray(file)) {
            _each(file, function(file) {
              add(file, name);
            });
          } else if ( file && (file.name || file.image)) {
            files.push({
              name: name,
              file: file,
              size: file.size,
              total: file.size,
              loaded: 0
            });
          }
        });

        if (!files.length) {
          // Create fake `file` object 
          files.push({ file: { name: api.expando }});
        }
        
        console.log('vvvvvvvvvvvvvvvvvvvvvvvv', files);
        return files;
      },

      _getFormData: function(options, data, fn) {
        var 
          file = data.file,
          name = data.name,
          filename = file.name,
          filetype = file.type,
          trans = api.support.transform && options.imageTransform,
          Form = new api.Form,
          queue = api.queue(function() { fn(Form); }),
          isOrignTrans = trans && _isOriginTransform(trans),
          postNameConcat = api.postNameConcat
        ;

        _each(options.data, function add(val, name) {
          if (typeof val == 'object') {
            _each(val, function(v, i) {
              add(v, postNameConcat(name, i));
            });
          } else {
            Form.append(name, val);
          }
        });

        (function _addFile(file) {
          if (file.image) {   // This is a FileAPI.Image
            queue.inc();

            
          } else if (api.Image && trans && (/^image/.test(file.type) || _rimgcanvas.test(file.nodeName))) {

          } else if (filename !== api.expando) {
            Form.append(name, file, filename);
          }
        })(file);

        queue.check();
      },


      reset: function(inp, notRemove) {
        var parent, clone;

        if (jQuery) {
          clone = jQuery(inp).clone(true).insertBefore(inp).val('')[0];
          if (!notRemove) {
            jQuery(inp).remove();
          }
        } else {
          parent = inp.parentNode;
          clone = parent.insertBefore(inp.cloneNode(true), inp);
          clone.value = '';

          if (!notRemove) {
            parent.removeChild(inp);
          }

          _each(_elEvents[api.uid(inp)], function(fns, type) {
            _each(fns, function(fn) {
              _off(inp, type, fn);
              _on(clone, type, fn);
            });
          });
        }

        return clone;
      }

    } // api
  ;

  function _emit(target, fn, name, res, ext) {
    var evt = {
      type: name.type || name,
      target: target,
      result: res
    };

    _extend(evt, ext);
    fn(evt);
  }


  function _simpleClone(obj) {
    var copy = {};
    _each(obj, function(val, key) {
      if (val && (typeof val === 'object') && (val.nodeType === void 0)) {
        val = _extend({}, val);
      }
      copy[key] = val;
    });

    return copy;
  }


  function isInputFile(el) {
    return _rinput.test(el && el.tagName);
  }



  if (jQuery && !jQuery.fn.dnd) {
    jQuery.fn.dnd = function(onHover, onDrop) {
      return this.each(function() {
        // api.event.dnd(this, onHover, onDrop);
      });
    };

    jQuery.fn.offdnd = function(onHover, onDrop) {
      return this.each(function() {
        // api.event.dnd.of(this, onHover, onDrop);
      });
    }
  }


  window.FileAPI = _extend(api, window.FileAPI);
console.log('wwwwwwwwwwwwwwwwwwww', window.FileAPI);
  // Debug info

  api.log('FileAPI: ' + api.version);
  api.log('protocol: ' + window.location.protocol);
	api.log('doctype: [' + doctype.name + '] ' + doctype.publicId + ' ' + doctype.systemId);

  // Configuration
  try {
    _supportConsoleLog = !!console.log;
    _supportConsoleLogApply = !!console.log.apply;
  } catch(err) {}

})(window, void 0);