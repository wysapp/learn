/*global window, FileAPI, document */

(function(api, document, undef) {
  'use strict';

  var 
    min = Math.min,
    round = Math.round,
    getCanvas = function() { return document.createElement('canvas') },
    support = false,
    exifOrientation = {
			  8:	270
			, 3:	180
			, 6:	90
			, 7:	270
			, 4:	180
			, 5:	90
    }
  ;

  try {
    support = getCanvas().toDataURL('image/png').indexOf('data:image/png') > -1;
  } catch(e) {}

  function Image(file){
    
    if (file instanceof Image) {
      var img = new Image(file.file);
      api.extend(img.matrix, file.matrix);
      return img;
    } else if (!(this instanceof Image)) {
      return new Image(file);
    }

    this.file = file;
    this.size = file.size || 100;

    this.matrix = {      
			sx: 0,
			sy: 0,
			sw: 0,
			sh: 0,
			dx: 0,
			dy: 0,
			dw: 0,
			dh: 0,
			resize: 0, // min, max OR preview
			deg: 0,
			quality: 1, // jpeg quality
			filter: 0
    };
  }

  Image.prototype = {
    image: true,
    constructor: Image,

    set: function(attrs) {
      api.extend(this.matrix, attrs);
      return this;
    },

    crop: function(x, y, w, h) {
      if (w === undef) {
        w = x;
        h = y;
        x = y = 0;
      }
			return	this.set({ sx: x, sy: y, sw: w, sh: h || w });
    },

    resize: function(w, h, strategy) {
      if (/min|max|height|width/.test(h)) {
        strategy = h;
        h = w;
      }

      return this.set({dw: w, dh: h || w, resize: strategy});
    },


    preview: function(w, h) {
      return this.resize(w, h || w, 'preview');
    },

    rotate: function(deg) {
      return this.set({deg: deg});
    },

    _load: function(image, fn) {
      var self = this;
      
      if (/img|video/i.test(image.nodeName)) {
        fn.call(self, null, image);
      } else {
        api.readAsImage(image, function(evt) {
          fn.call(self, evt.type != 'load', evt.result);
        });
      }
    },


    _trans: function(fn) {
      this._load(this.file, function(err, image) {
        if (err) {
          fn(err);
        } else {
          try {
            this._apply(image, fn);
          } catch(err) {
            api.log('[err] FileAPI.Image.fn._apply:', err);
            fn(err);
          }
        }
      });
    },


    get: function(fn) {
      
      if (api.support.transform){
        var _this = this, matrix = _this.matrix;

        if (matrix.deg === 'auto') {
          
          api.getInfo(_this.file, function(err, info) {
            
            matrix.deg = exifOrientation[info && info.exif && info.exif.Orientation] || 0;
            _this._trans(fn);
          });
        } else {
          _this._trans(fn);
        }
      } else {
        fn('not_support_transform');
      }

      return this;
    },

    toData: function(fn) {
      return this.get(fn);
    }
  }

  // @export
  api.support.canvas = api.support.transform = support;
  api.Image = Image;
})(FileAPI, document);