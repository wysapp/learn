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


    _toString = {}.toString,
    _supportConsoleLog,
    _supportConsoleLogApply,

    Math = window.Math,


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
        
      },

    }
  ;


  window.FileAPI = _extend(api, window.FileAPI);
console.log('wwwwwwwwwwwwwwwwwwww', window.FileAPI);
  // Debug info

  api.log('FileAPI: ' + api.version);
  api.log('protocol: ' + window.location.protocol);
	api.log('doctype: [' + doctype.name + '] ' + doctype.publicId + ' ' + doctype.systemId);


})(window, void 0);