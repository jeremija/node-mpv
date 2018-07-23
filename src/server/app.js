const express = require('express')
const browserify = require('browserify-middleware')
const less = require('less-middleware')
const config = require('./config.js')
const http = require('http').Server(app)
const io = require('socket.io')(http)
const path = require('path')
const os = require('os')
const ServerSocket = require('./ServerSocket')

const app = express()

const Youtube = require('./src/server/youtube.js')
const YoutubeApi = require('youtube-node')
const youtubeApi = new YoutubeApi()
youtubeApi.setKey(config.youtubeKey)
const youtube = new Youtube(youtubeApi)

const tempDir = path.join(os.tmpdir(), 'node-mpv-css-cache')
let lastTitle = '(no title)'

function log () {
  const args = Array.prototype.slice.call(arguments)
  io.emit('status', args.join(' '))
  console.log.apply(console, args)
}

const mpvConfig = require('./src/server/mpv.js')
const mpv = mpvConfig.init(config.mpvBinary, config.mpvArgs, config.mpvSocket)
.onEvent((err, event) => {
  if (err) {
    log('event error:', err)
    return
  }
  log('event: ', JSON.stringify(event))
  if (event.event === 'tracks-changed') {
    mpv.sendCommand('get-title').then(event => {
      lastTitle = event.data
      console.log('title event: ', event)
      io.emit('title', event.data)
    })
  }
}).spawn()
app.set('views', path.join(__dirname, '..', 'views'))
app.set('view engine', 'pug')

app.get('/', function (req, res) {
  res.render('index', {
    url: req.query.url || '',
    title: lastTitle
  })
  if (req.query.url) {
    mpv.play(req.query.url)
  }
})

app.use('/js', browserify('./src/js'))
app.use('/less', less('./src/less', { dest: tempDir }))
app.use('/less', express.static(tempDir))
app.use('/less/fonts', express.static('./src/less/fonts'))
app.use('/api', require('./src/server/middleware.js')(youtube, mpv))

io.on('connection', socket => new ServerSocket({ socket, mpv }))

module.exports = app
