var express = require('express');

function init(youtube) {
    var router = express.Router();

    router.get('/youtube/search', function(req, res) {
        youtube.search(req.query.value).then(results => {
            res.json(results);
        }).error(err => {
            res.status(500).err(err.message);
        });
    });

    return router;
}

module.exports = init;
