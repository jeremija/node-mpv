'use strict'
const EventEmitter = require('events')
const log = require('./Logger').getLogger(__filename)
const CausedError = require('./CausedError')
const net = require('net')

class MpvClient extends EventEmitter {
  /**
   * Initialize a new instance
   * @param {Object} options
   * @param {String} options.socketPath Path to mpv socket
   */
  constructor ({ socketPath = '/tmp/mpv.sock' } = {}) {
    super()
    this.socketPath = socketPath
    this.client = null
    this.error = null

    this._handleError = this._handleError.bind(this)
    this._handleClose = this._handleClose.bind(this)
  }

  /**
   * Connect to the MPV socket
   * @returns {Promise}
   */
  async connect () {
    log('connect() connecting to socket: %s', this.socketPath)
    this.error = null
    this.close()
    await new Promise((resolve, reject) => {
      this.client = net.createConnection(this.socketPath)

      const onData = data => {
        log('connect() received initial data, resolving promise!')
        resolve()
        this.client.removeListener('error', onError)
        data = data.toString('utf8')
        data.trim().split('\n').forEach(event => {
          event = JSON.parse(event)
          this.emit('event', event)
        })
      }

      const onError = err => {
        log('connect() error: %s', err.stack)
        reject(err)
        this.client.removeListener('data', onData)
      }

      log('connect() adding handlers')
      this.client.on('error', this._handleError)
      this.client.on('data', onData)
      this.client.once('error', onError)
      this.client.on('close', this._handleClose)
    })
  }

  async write (command) {
    const json = JSON.stringify({ command })
    log('write() json: %s', command)
    await new Promise((resolve, reject) => {
      this.client.write(json + '\n', 'utf-8', err => {
        if (err) {
          // will be handled by error listener. if we reject the promise here
          // and remove the error listener, the error event will still be
          // emitted and halt the node process...
          return
        }
        this.client.removeListener('error', onError)
        log('write() resolving promise')
        resolve()
      })

      const onError = err => {
        reject(new CausedError('Error writing message: ' + json, err))
      }
      this.client.once('error', onError)
    })
  }

  async writeAndRead (command) {
    const promise = new Promise((resolve, reject) => {
      function onEvent (event) {
        this.removeListener('close', onClose)
        if (event.error !== 'success') {
          reject(new Error('Command failed with error: ' + event.error))
          return
        }
        resolve(event)
      }
      function onClose () {
        this.removeListener('event', onEvent)
        reject(new Error('Connecting closed while waiting for response'))
      }
      this.once('event', onEvent)
      this.once('close', onClose)
    })

    await this.write(command)
    return promise
  }

  _handleError (err) {
    log('_handleError() error: %s', err.stack)
    this.error = err
  }

  _handleClose () {
    log('_handleClose() close event')
    this.client.removeAllListeners()
    this.client = null
    this.emit('close')
  }

  /**
   * Closes the connection
   */
  async close () {
    log('close()')
    const { client } = this
    if (!client) {
      log('close() no client, returning early')
      return
    }

    const promise = new Promise((resolve) => {
      client.once('close', () => {
        log('close() close event, resolving promise...')
        resolve()
      })
    })

    log('close() ending and destroying client')
    client.end()
    client.destroy()

    await promise
  }
}

module.exports = MpvClient
