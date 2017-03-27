var fs = require('fs');
var qs = require('qs');
var imageSize = require('image-size');

function fileApi() {
  return function(req, res, next) {

    next();
  }
}

module.exports = fileApi;