'use strict'
let express = require('express')

function sendError (res, statusCode, err) {
  res.status(statusCode).json({error: err.message || err.error})
}

function init (youtube, mpv) {
  var router = express.Router()

  router.get('/youtube/search', (req, res) => {
    youtube.search(req.query.value, 10)
    .then(results => res.json(results))
    .catch(err => sendError(res, 500, err))
  })

  router.get('/mpv/play', (req, res) => {
    console.log('/mpv/play req.query', req.query)
    mpv.play(req.query.url)
    .then(r => res.json(r))
    .catch(e => sendError(res, 400, e))
  })

  router.get('/mpv/pause', (req, res) => {
    mpv.pause().then(r => res.json(r)).catch(e => sendError(res, 400, e))
  })

  router.get('/mpv/stop', (req, res) => {
    mpv.stop().then(r => res.json(r)).catch(e => sendError(res, 400, e))
  })

  router.get('/mpv/next', (req, res) => {
    mpv.next().then(r => res.json(r)).catch(e => sendError(res, 400, e))
  })

  router.get('/mpv/volume-up', (req, res) => {
    mpv.volumeUp().then(r => res.json(r)).catch(e => sendError(res, 400, e))
  })

  router.get('/mpv/volume-down', (req, res) => {
    mpv.volumeDown().then(r => res.json(r)).catch(e => sendError(res, 400, e))
  })

  return router
}

module.exports = init
