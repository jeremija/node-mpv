'use strict';
let net = require('net');
let helpers = require('./helpers.js');

let RETRY_INTERVAL = 1000;

var COMMANDS = {
  'stop': {'command': ['quit']},
  'pause': {'command': ['cycle', 'pause']},
  'next': {'command': ['playlist_next']},
  'volume-up': {'command': ['add', 'volume', 5]},
  'volume-down': {'command': ['add', 'volume', -5]},
  'get-title': {'command': ['get_property', 'media-title']}
};

/**
 * Initialize a new instance
 * @param socketPath String path to mpv socket
 */
function init(socketPath) {
  let client;
  let nextListeners = [];
  let retryErrorHandler;
  let timeout;
  /**
   * Connect to the MPV socket
   * @param callback Function execute when an event or error occurs
   * @param keepTrying Boolean to reconnect or not
   */
  function connect(callback, keepTrying) {
    if (!callback) throw new TypeError('callback must be defined');
    close();
    client = net.createConnection(socketPath);

    client.on('data', data => {
      data = helpers.ab2str(data);
      if (!data) return;
      data.split('\n').forEach(item => {
        if (!item) return;
        item = JSON.parse(item);
        if (item.hasOwnProperty('data') && nextListeners.length) {
          nextListeners.forEach(listener => listener(item));
          clearNextListeners();
        }
        callback(undefined, item);
      });
    });
    client.on('error', err => callback(err));
    if (keepTrying) {
      if (retryErrorHandler) client.removeListener('error', retryErrorHandler);
      retryErrorHandler = createRetryErrorHandler(callback);
      client.on('error', retryErrorHandler);
    }
    return self;
  }
  /**
   * Send a command to mpv
   * @param command String command name
   */
  function write(command) {
    if (!client) return;
    let commandJson = COMMANDS[command];
    if (!commandJson) throw new Error('No such command: ' + command);
    commandJson = JSON.stringify(commandJson) + '\n';
    client.write(commandJson, 'utf-8');
    return self;
  }
  /**
   * Creates a handler which will be used to retry connection on error
   * @private
   * @param callback Function
   */
  function createRetryErrorHandler(callback) {
    return function() {
      close();
      timeout = setTimeout(() => connect(callback, true), RETRY_INTERVAL);
    };
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
    if (retryErrorHandler) client.removeListener('error', retryErrorHandler);
    client.end();
    client = undefined;
  }
  let self = {connect, write, addNextListener, clearNextListeners, close};
  return self;
}

module.exports = {init};
