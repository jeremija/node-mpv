'use strict';
let Promise = require('bluebird');

function init(youtube) {

    function search(title) {
        return new Promise((resolve, reject) => {
            youtube.search(title, 10, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }

    return {search};
}

module.exports = init;
