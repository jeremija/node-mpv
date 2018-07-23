'use strict'
let express = require('express')

const handleAsync = callback => (req, res, next) => {
  callback(req, res, next)
  .then(result => res.json(result))
  .catch(next)
}

function createYoutubeRoute ({ youtube }) {
  var router = express.Router()

  router.get('/youtube/search', handleAsync(async (req, res) => {
    return youtube.search(req.query.value, 10)
  }))

  return router
}

module.exports = {
  handleAsync,
  createYoutubeRoute
}
