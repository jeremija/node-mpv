'use strict';
let Promise = require('bluebird');

function init(youtube) {

  function search(title) {
    return new Promise((resolve, reject) => {
      youtube.search(title, 5, (err, result) => {
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
