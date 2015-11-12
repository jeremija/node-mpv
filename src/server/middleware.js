'use strict';
let express = require('express');

function init(youtube) {
    var router = express.Router();

    router.get('/youtube/search', function(req, res) {
        youtube.search(req.query.value).then(results => {
            res.json(results);
        }).catch(err => {
            res.status(500).send({error: err.message});
        });
    });

    return router;
}

module.exports = init;
