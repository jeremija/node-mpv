'use strict';
let childProcess = require('child_process');
let mpvSocketConfig = require('./mpvSocket.js');
let Promise = require('bluebird');

function BLANK() {}

function init(mpvBinary, mpvSocketPath) {
  let callback;
  let mpv;
  let mpvSocket;
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

  function stop() {
    if (mpv) {
      mpv.kill('SIGHUP');
      mpv = undefined;
    }
    stopMpvSocket();
    return self;
  }

  function sendCommand(command) {
    return new Promise(function(resolve, reject) {
      if (!mpvSocket) {
        reject(new Error('No mpvSocket available'));
        return;
      }
      try {
        mpvSocket.addNextListener(resolve).write(command);
      } catch(err) {
        mpvSocket.clearNextListeners();
        reject(err);
      }
    });
  }

  function start(url) {
    stop();

    let command = mpvBinary;
    let args = [
      '--input-unix-socket',
      mpvSocketPath,
      '--quiet',
      url
    ];

    log('starting mpv instance...');
    log('command:', command, args.join(' '));

    mpv = childProcess.spawn(command, args, {});

    // mpv.stdin.setEncoding('utf-8');

    function onDataConnectToSocket(data) {
      if (mpvSocket) mpvSocket.close();
      mpvSocket = mpvSocketConfig.init(mpvSocketPath)
        .connect(callback, false);
    }

    mpv.stdout.once('data', onDataConnectToSocket);

    mpv.on('close', function(code) {
      log('mpv exited with code ' + code);
      mpv = undefined;
      stopMpvSocket();
    });

    return self;
  }

  let self = {start, stop, onEvent, sendCommand};
  return self;
}

module.exports = {init};
