/*global window, FileAPI */

(function(api, window) {
  'use strict';

  var 
    document = window.document,
    FormData = window.FormData,
    Form = function() { this.items = []; },
    encodeURIComponent = window.encodeURIComponent
  ;

  Form.prototype = {
    append: function(name, blob, file, type) {
      this.items.push({
        name: name,
        blob: blob && blob.blob || (blob == void 0 ? '' : blob),
        file: blob && ( file || blob.name),
        type: blob && ( type || blob.type)
      })
    },

    each: function(fn) {
      var i = 0, n = this.items.length;
      for (; i < n; i++) {
        fn.call(this, this.items[i]);
      }
    },

    toData: function(fn, options) {
      options._chunked = api.support.chunked && options.chunkSize > 0 && api.filter(this.items, function(item) {return item.file; }).length == 1;

      if (!api.support.html5) {
        api.log('FileAPI.Form.toHtlData');
        this.toHtmlData(fn);
      } else if (!api.formData || this.multipart || !FormData) {
        api.log('FileAPI.Form.toMultipartData');
        this.toMultipartData(fn);
      } else if (options._chunked) {
        api.log('FileAPI.Form.toPlainData');
        this.toPlainData(fn);
      } else {
        api.log('FileAPI.Form.toFormData');
        this.toFormData(fn);
      }
    },

    _to: function(data, complete, next, arg) {
      var queue = api.queue(function() {
        complete(data);
      });

      this.each(function(file) {
        try {
          next(file, data, queue, arg);
        } catch(err) {
          api.log('FileAPI.Form._to: ' + err.message);
          complete(err);
        }
      });

      queue.check();
    },

    toFormData: function(fn) {
      this._to(new FormData, fn, function(file, data, queue) {
        if (file.blob && file.blob.toBlob) {
          queue.inc();
          _convertFile(file, function(file, blob) {
            data.append(file.name, blob, file.file);
            queue.next();
          });
        } else if (file.file) {
          data.append(file.name, file.blob, file.file);
        } else {
          data.append(file.name, file.blob);
        }

        if (file.file) {
          data.append('_' + file.name, file.file);
        }

      });
    }

  };


  api.Form = Form;
})(FileAPI, window);