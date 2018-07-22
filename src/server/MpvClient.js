'use strict'
const EventEmitter = require('events')
const helpers = require('./helpers.js')
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

      function onData (data) {
        resolve()
        this.client.removeListener('error', onError)
        data = helpers.ab2str(data)
        if (!data) return
        data.split('\n').forEach(item => {
          if (!item) return
          item = JSON.parse(item)
          this.emit('event', item)
        })
      }

      function onError (err) {
        reject(err)
        this.client.removeListener('data', onData)
        this.emit('error', err)
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
          reject(err)
          return
        }
        resolve()
      })
    })
  }

  async writeAndRead (command) {
    const promise = new Promise((resolve, reject) => {
      function onEvent (item) {
        this.removeListener('error', onError)
        resolve(item)
      }
      function onError (err) {
        this.removeListener('event', onEvent)
        reject(err)
      }
      this.once('event', onEvent)
      this.once('error', onError)
    })

    await this.write(command)
    await promise
  }

  /**
   * Closes the connection and deactivates potential timeout
   */
  close () {
    const { client } = this
    this.removeAllListeners()
    if (!client) {
      return
    }
    client.end()
    client.destroy()
    this.client = undefined
    return this
  }
}

module.exports = MpvClient
