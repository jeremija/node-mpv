'use strict'
const CausedError = require('./CausedError')
const EventEmitter = require('events')
const log = require('./Logger').getLogger(__filename)
const net = require('net')
const { PromiseTimeout } = require('./Timeout')

class MpvClient extends EventEmitter {
  /**
   * Initialize a new instance
   * @param {Object} options
   * @param {String} options.socketPath Path to mpv socket
   */
  constructor ({
    socketPath = '/tmp/mpv.sock',
    timeout = 1000
  } = {}) {
    super()
    this.socketPath = socketPath
    this.promiseTimeout = new PromiseTimeout(timeout)
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
    let cleanup
    const promise = new Promise((resolve, reject) => {
      this.client = net.createConnection(this.socketPath)

      const onData = data => {
        log('connect() received initial data, resolving promise!')
        this.client.removeListener('error', onError)
        resolve()
        data = data.toString('utf8')
        data.trim().split('\n').forEach(event => {
          event = JSON.parse(event)
          this.emit('event', event)
        })
      }

      const onError = err => {
        this.client.removeListener('data', onData)
        log('connect() error: %s', err.stack)
        reject(err)
      }

      cleanup = async () => {
        await this.close()
      }

      log('connect() adding handlers')
      this.client.on('error', this._handleError)
      this.client.on('data', onData)
      this.client.once('error', onError)
      this.client.on('close', this._handleClose)
    })

    // If connect() times out it might leave the class in an invalid state
    // because it will still have the main error and close listeners attached.
    // But if the error listener is removed, it might break the whole
    // application in case something happens afterwards.
    return this.promiseTimeout.handle(promise, {
      action: 'connect',
      cleanup
    })
  }

  async write (command) {
    const json = JSON.stringify({ command })
    log('write() json: %s', command)
    let cleanup
    const promise = new Promise((resolve, reject) => {
      this.client.write(json + '\n', 'utf-8', err => {
        if (err) {
          log('write() received error, returning early')
          // will be handled by error listener. if we reject the promise here
          // and remove the error listener, the error event will still be
          // emitted and halt the node process...
          return
        }
        cleanup()
        log('write() resolving promise')
        resolve()
      })

      const onError = err => {
        log('write() onError: %s', err.stack)
        reject(new CausedError('Error writing message: ' + json, err))
      }

      cleanup = () => {
        this.client.removeListener('error', onError)
      }
      this.client.once('error', onError)
    })

    await this.promiseTimeout.handle(promise, {
      action: 'write',
      cleanup
    })
  }

  async writeAndRead (command) {
    let cleanup
    const promise = new Promise((resolve, reject) => {
      const onEvent = event => {
        cleanup()
        if (event.error !== 'success') {
          reject(new Error('Command failed with error: ' + event.error))
          return
        }
        resolve(event)
      }
      const onClose = () => {
        cleanup()
        reject(new Error('Connecting closed while waiting for response'))
      }
      cleanup = () => {
        this.removeListener('event', onEvent)
        this.removeListener('close', onClose)
      }
      this.once('event', onEvent)
      this.once('close', onClose)
    })

    await this.write(command)
    return this.promiseTimeout.handle(promise, {
      action: 'writeAndRead',
      cleanup
    })
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

    await this.promiseTimeout.handle(promise, { action: 'close' })
  }
}

module.exports = MpvClient
