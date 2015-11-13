'use strict';
let Promise = require('bluebird');

function init(youtube) {

  function search(title, results) {
    return new Promise((resolve, reject) => {
      youtube.search(title, results || 5, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result.items);
      });
    });
  }

  return {search};
}

module.exports = init;
