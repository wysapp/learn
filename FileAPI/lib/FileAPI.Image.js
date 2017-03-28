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


    _apply: function(image, fn) {
      var 
        canvas = getCanvas(),
        m = this.getMatrix(image),
        ctx = canvas.getContext('2d'),
        width = image.videoWidth || image.width,
        height = image.videoHeight || image.height,
        deg = m.deg,
        dw = m.dw,
        dh = m.dh,
        w = width,
        h = height,
        filter = m.filter,
        copy,  // canvas copy 
        buffer = image,
        overlay = m.overlay,
        queue = api.queue(function() { image.src = api.EMPTY_PNG; fn(false, canvas); }),
        renderImageToCanvas = api.renderImageToCanvas
      ;

      // Normalize angle
			deg = deg - Math.floor(deg/360)*360;

			// For `renderImageToCanvas`
			image._type = this.file.type;

			while(m.multipass && min(w/dw, h/dh) > 2 ){
				w = (w/2 + 0.5)|0;
				h = (h/2 + 0.5)|0;

				copy = getCanvas();
				copy.width  = w;
				copy.height = h;

				if( buffer !== image ){
					renderImageToCanvas(copy, buffer, 0, 0, buffer.width, buffer.height, 0, 0, w, h);
					buffer = copy;
				}
				else {
					buffer = copy;
					renderImageToCanvas(buffer, image, m.sx, m.sy, m.sw, m.sh, 0, 0, w, h);
					m.sx = m.sy = m.sw = m.sh = 0;
				}
			}


			canvas.width  = (deg % 180) ? dh : dw;
			canvas.height = (deg % 180) ? dw : dh;

			canvas.type = m.type;
			canvas.quality = m.quality;

			ctx.rotate(deg * Math.PI / 180);
			renderImageToCanvas(ctx.canvas, buffer
				, m.sx, m.sy
				, m.sw || buffer.width
				, m.sh || buffer.height
				, (deg == 180 || deg == 270 ? -dw : 0)
				, (deg == 90 || deg == 180 ? -dh : 0)
				, dw, dh
			);
			dw = canvas.width;
			dh = canvas.height;

			// Apply overlay
			overlay && api.each([].concat(overlay), function (over){
				queue.inc();
				// preload
				var img = new window.Image, fn = function (){
					var
						  x = over.x|0
						, y = over.y|0
						, w = over.w || img.width
						, h = over.h || img.height
						, rel = over.rel
					;

					// center  |  right  |  left
					x = (rel == 1 || rel == 4 || rel == 7) ? (dw - w + x)/2 : (rel == 2 || rel == 5 || rel == 8 ? dw - (w + x) : x);

					// center  |  bottom  |  top
					y = (rel == 3 || rel == 4 || rel == 5) ? (dh - h + y)/2 : (rel >= 6 ? dh - (h + y) : y);

					api.event.off(img, 'error load abort', fn);

					try {
						ctx.globalAlpha = over.opacity || 1;
						ctx.drawImage(img, x, y, w, h);
					}
					catch (er){}

					queue.next();
				};

				api.event.on(img, 'error load abort', fn);
				img.src = over.src;

				if( img.complete ){
					fn();
				}
			});

			if( filter ){
				queue.inc();
				Image.applyFilter(canvas, filter, queue.next);
			}

			queue.check();

    },


    getMatrix: function (image){
			var
				  m  = api.extend({}, this.matrix)
				, sw = m.sw = m.sw || image.videoWidth || image.naturalWidth ||  image.width
				, sh = m.sh = m.sh || image.videoHeight || image.naturalHeight || image.height
				, dw = m.dw = m.dw || sw
				, dh = m.dh = m.dh || sh
				, sf = sw/sh, df = dw/dh
				, strategy = m.resize
			;

			if( strategy == 'preview' ){
				if( dw != sw || dh != sh ){
					// Make preview
					var w, h;

					if( df >= sf ){
						w	= sw;
						h	= w / df;
					} else {
						h	= sh;
						w	= h * df;
					}

					if( w != sw || h != sh ){
						m.sx	= ~~((sw - w)/2);
						m.sy	= ~~((sh - h)/2);
						sw		= w;
						sh		= h;
					}
				}
			}
			else if( strategy == 'height' ){
				dw = dh * sf;
			}
			else if( strategy == 'width' ){
				dh = dw / sf;
			}
			else if( strategy ){
				if( !(sw > dw || sh > dh) ){
					dw = sw;
					dh = sh;
				}
				else if( strategy == 'min' ){
					dw = round(sf < df ? min(sw, dw) : dh*sf);
					dh = round(sf < df ? dw/sf : min(sh, dh));
				}
				else {
					dw = round(sf >= df ? min(sw, dw) : dh*sf);
					dh = round(sf >= df ? dw/sf : min(sh, dh));
				}
			}

			m.sw = sw;
			m.sh = sh;
			m.dw = dw;
			m.dh = dh;
			m.multipass = api.multiPassResize;
			return	m;
		},


    _trans: function(fn) {
      this._load(this.file, function(err, image) {
        console.log('sssssssssssssssssssss', image);
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

  /**
	 * For load-image-ios.js
	 */
  api.renderImageToCanvas = function(canvas, img, sx, sy, sw, sh, dx, dy, dw, dh) {
    try {
      return canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    } catch (ex) {
      api.log('renderImageToCanvas failed');
      throw ex;
    }
  };


  // @export
  api.support.canvas = api.support.transform = support;
  api.Image = Image;
})(FileAPI, document);