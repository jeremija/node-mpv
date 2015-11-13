'use strict';
let express = require('express');
let app = express();
let browserify = require('browserify-middleware');
let less = require('less-middleware');
let config = require('./config.js');
let http = require('http').Server(app);
let io = require('socket.io')(http);
let path = require('path');
let os = require('os');

let Youtube = require('./src/server/youtube.js');
let YoutubeApi = require('youtube-node');
let youtubeApi = new YoutubeApi();
youtubeApi.setKey(config.youtubeKey);
let youtube = new Youtube(youtubeApi);

let tempDir = path.join(os.tmpDir(), 'node-mpv-css-cache');

function log() {
  let args = Array.prototype.slice.call(arguments);
  io.emit('status', args.join(' '));
  console.log.apply(console, args);
}

let mpvConfig = require('./src/server/mpv.js');
let mpv = mpvConfig.init(config.mpvBinary, config.mpvSocket)
.onEvent((err, event) => {
  if (err) {
    log('event error:', err);
    return;
  }
  log('event: ', JSON.stringify(event));
  if (event.event === 'tracks-changed') {
    mpv.sendCommand('get-title').then(event => {
      console.log('title event: ', event);
      io.emit('title', event.data);
    });
  }
});
let urlHistory = [];

app.set('views', './src/views');
app.set('view engine', 'jade');

app.get('/', function(req, res) {
  res.render('index', {
    url: req.query.url || '',
    urlHistory: urlHistory
  });
  if (req.query.url) {
    mpv.start(req.query.url);
  }
});

app.use('/js', browserify('./src/js'));
app.use('/less', less('./src/less', { dest: tempDir}));
app.use('/less', express.static(tempDir));
app.use('/less/fonts', express.static('./src/less/fonts'));
app.use('/api', require('./src/server/middleware.js')(youtube));

io.on('connection', function(socket) {
  socket.on('url', function(url) {
    log('url set to:', url);

    mpv.start(url);
    io.emit('url-history', url);
    urlHistory.splice(0, 0, url);
    if (urlHistory.length > 5) urlHistory.pop();
  });

  socket.on('command', command => mpv.sendCommand(command).catch(log));
});

http.listen(process.env.PORT || 3000, function() {
  console.log('listening on http://*:3000');
  console.log('you can use http://localhost:3000');
});
