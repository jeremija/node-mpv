var app = require('express')();
var browserify = require('browserify-middleware');
var childProcess = require('child_process');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var net = require('net');

var mpv = undefined;
var mpvSocket = '/tmp/mpvsocket';
var urlHistory = [];

app.set('views', './src/views')
app.set('view engine', 'jade')

app.get('/', function(req, res) {
  res.render('index', {
    url: req.query.url || '',
    urlHistory: urlHistory
  });
  if (req.query.url) {
    startMpv(req.query.url);
  }
});

app.use('/js', browserify('./src/js'));

function log() {
    var args = Array.prototype.slice.call(arguments);
    io.emit('status', args.join(' '));
    console.log.apply(console, args);
}

var COMMANDS = {
  'stop': {'command': ['quit']},
  'pause': {'command': ['cycle', 'pause']},
  'next': {'command': ['playlist_next']}
}

function sendCommand(command, silent) {
  command = COMMANDS[command];
  if (!command) {
    log('unknown command:', command);
    return;
  }
  command = JSON.stringify(command) + '\n';
  var client = net.createConnection(mpvSocket, function() {
    client.write(command, 'utf-8', function(err) {
      if (err) {
        log('error sending command to mpv', err.message);
      }
      client.end();
    });
  });

  client.on('error', function(err) {
      if (!silent) log(err.message);
  });
}

http.listen(process.env.PORT || 3000, function() {
  console.log('listening on http://*:3000');
  console.log('you can use http://localhost:3000')
});

io.on('connection', function(socket) {
  socket.on('url', function(url) {
    log('url set to:', url.url);
    try {
      startMpv(url.url, url.display);
      io.emit('url-history', url.url);
      urlHistory.splice(0, urlHistory.length > 5 ? 1 : 0, url);

      log('started mpv');
    } catch (err) {
      log('caught error', err.message);
    }
  });

  socket.on('stop', sendCommand.bind(null, 'stop'));
  socket.on('pause', sendCommand.bind(null, 'pause'));
  socket.on('next', sendCommand.bind(null, 'next'));
});

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function startMpv(url, display) {
  sendCommand('stop', true);

  var command = 'mpv';
  var args = [
    '--input-unix-socket',
    mpvSocket,
    '--quiet',
    url
  ]

  log('command:', command, args.join(' '));

  mpv = childProcess.spawn(command, args, {
    env: {
      DISPLAY: display
    }
  });
  mpv.stdin.setEncoding('utf-8');
  log('starting mpv instance...');

  mpv.stdout.on('data', function(data) {
    var data = ab2str(data);
    process.stdout.write(data);
    io.emit('status', data);
  });

  mpv.stderr.on('data', function(data) {
    data = ab2str(data);
    process.stdout.write(data);
    io.emit('status-err', data);
  });

  mpv.on('close', function(code) {
    log('mpv exited with code ' + code);
    mpv = undefined;
  });

  mpv.on('error', function(err) {
    log(err.message, err);
  });
}
