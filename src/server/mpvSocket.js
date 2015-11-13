'use strict';
let net = require('net');
let helpers = require('./helpers.js');

let RETRY_INTERVAL = 1000;

var COMMANDS = {
  'stop': ['quit'],
  'pause': ['cycle', 'pause'],
  'next': ['playlist_next'],
  'volume-up': ['add', 'volume', 5],
  'volume-down': ['add', 'volume', -5],
  'get-title': ['get_property', 'media-title']
};

/**
 * Initialize a new instance
 * @param socketPath String path to mpv socket
 */
function init(socketPath) {
  let client;
  let nextListeners = [];
  let timeout;
  /**
   * Connect to the MPV socket
   * @param callback Function execute when an event or error occurs
   * @param keepTrying Boolean to reconnect or not
   * @param retryInterval Number amount of ms to wait before retrying
   */
  function connect(callback, keepTrying, retryInterval) {
    if (!callback) throw new TypeError('callback must be defined');
    close();
    client = net.createConnection(socketPath);

    client.on('data', data => {
      data = helpers.ab2str(data);
      if (!data) return;
      data.split('\n').forEach(item => {
        if (!item) return;
        item = JSON.parse(item);
        if (!item.hasOwnProperty('event') && nextListeners.length) {
          nextListeners.forEach(listener => listener(item));
          clearNextListeners();
        }
        callback(undefined, item);
      });
    });
    client.on('error', err => {
      callback(err);
      // if keep trying and close was not called, keep trying to connect
      if (keepTrying && client) connect(callback, true, retryInterval);
    });
    return self;
  }
  /**
   * Send a command to mpv
   * @param command String command name
   */
  function _getPresetCommand(commandString) {
    return COMMANDS[commandString];
  }
  /**
   * Send a command to mpv
   * @param command String|Array command name
   */
  function write(commandParams) {
    if (!client) return;
    if (typeof commandParams === 'string') {
      commandParams = _getPresetCommand(commandParams);
    }
    if (!commandParams) {
      throw new TypeError('command arguments missing');
    }
    let commandJson = {command: commandParams};
    client.write(JSON.stringify(commandJson) + '\n', 'utf-8');
    return self;
  }
  /**
   * Adds a listener which will be executed only once
   * @param callback Function listener
   */
  function addNextListener(callback) {
    if (callback) nextListeners.push(callback);
    return self;
  }
  function clearNextListeners() {
    nextListeners = [];
  }
  /**
   * Closes the connection and deactivates potential timeout
   */
  function close() {
    clearTimeout(timeout);
    if (!client) return;
    client.removeAllListeners();
    client.end();
    client.destroy();
    client = undefined;
  }
  let self = {connect, write, addNextListener, clearNextListeners, close};
  return self;
}

module.exports = {init};
