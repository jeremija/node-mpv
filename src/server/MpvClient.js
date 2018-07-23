'use strict'
const EventEmitter = require('events')
// const log = require('./Logger').getLogger('jukebox:MpvClient')
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
    return this
  }

  /**
   * Connect to the MPV socket
   * @returns {Promise}
   */
  async connect () {
    this.close()
    await new Promise((resolve, reject) => {
      this.client = net.createConnection(this.socketPath)

      const onData = data => {
        resolve()
        this.client.removeListener('error', onError)
        data = data.toString('utf8')
        data.trim().split('\n').forEach(event => {
          event = JSON.parse(event)
          this.emit('event', event)
        })
      }

      const onError = err => {
        reject(err)
        this.client.removeListener('data', onData)
      }

      this.client.on('data', onData)
      this.client.once('error', onError)
    })
  }

  async write (command) {
    const json = JSON.stringify({ command })
    await new Promise((resolve, reject) => {
      this.client.write(json + '\n', 'utf-8', err => {
        if (err) {
          // will be handled by error listener. if we reject the promise here
          // and remove the error listener, the error event will still be
          // emitted and halt the node process...
          return
        }
        this.client.removeListener('error', onError)
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
        if (event.error !== 'success') {
          reject(
            new Error('Command rejected with error: ' + event.error)
          )
          return
        }
        resolve(event)
      }
      this.once('event', onEvent)
    })

    await this.write(command)
    return promise
  }

  /**
   * Closes the connection
   */
  async close () {
    const { client } = this
    if (!client) {
      return
    }

    const promise = new Promise((resolve, reject) => {
      client.once('close', () => {
        client.removeAllListeners()
        this.client = undefined
        resolve()
      })

      client.once('error', err => {
        client.removeAllListeners()
        this.client = undefined
        reject(err)
      })
    })
    client.end()
    client.destroy()

    await promise
  }
}

module.exports = MpvClient
