'use strict';
let childProcess = require('child_process');
let mpvSocketConfig = require('./mpvSocket.js');
let Promise = require('bluebird');

function BLANK() {}

function init(mpvBinary, mpvSocketPath) {
  let callback, mpv, mpvSocket;
  function log() {
    console.log.apply(console, arguments);
  }

  function onEvent(p_callback) {
    if (p_callback) callback = p_callback;
    else callback = BLANK;
    return self;
  }

  function stopMpvSocket() {
    if (!mpvSocket) return;
    mpvSocket.close();
    mpvSocket = undefined;
  }

  function kill() {
    if (mpv) {
      mpv.kill('SIGHUP');
      mpv = undefined;
    }
    stopMpvSocket();
    return self;
  }

  function sendCommand(command) {
    console.log('sending command', command);
    return new Promise(function(resolve, reject) {
      if (!mpvSocket) {
        reject(new Error('No mpvSocket available'));
        return;
      }
      try {
        mpvSocket.addNextListener(resolve).write(command);
      } catch (err) {
        mpvSocket.clearNextListeners();
        reject(err);
      }
    });
  }

  function play(url) {
    if (!mpv) spawn();
    return sendCommand(['loadfile', url]);
  }

  function pause() {
    if (!mpv) spawn();
    return sendCommand('pause');
  }

  function stop() {
    if (!mpv) spawn();
    return sendCommand('stop');
  }

  function next() {
    if (!mpv) spawn();
    return sendCommand('next');
  }

  function volumeUp() {
    if (!mpv) spawn();
    return sendCommand('volume-up');
  }

  function volumeDown() {
    if (!mpv) spawn();
    return sendCommand('volume-down');
  }

  function spawn() {
    if (mpv) throw new Error('Already spawned!');

    let command = mpvBinary;
    let args = [
      '--input-unix-socket',
      mpvSocketPath || '/tmp/mpvsocket',
      '--quiet',
      '--idle',
      './blank.wav'
    ];

    log('starting mpv instance...');
    log('command:', command, args.join(' '));

    mpv = childProcess.spawn(command, args, {});

    // mpv.stdin.setEncoding('utf-8');

    mpv.stdout.once('data', data => {
      if (mpvSocket) mpvSocket.close();
      mpvSocket = mpvSocketConfig.init(mpvSocketPath)
        .connect(callback, false);
    });

    mpv.on('close', function(code) {
      log('mpv exited with code ' + code);
      mpv = undefined;
      stopMpvSocket();
    });

    return self;
  }

  let self = {
    spawn,
    kill,
    onEvent,
    play,
    pause,
    stop,
    next,
    volumeUp,
    volumeDown,
    sendCommand
  };
  return self;
}

module.exports = {init};
