'use strict'
const EventEmitter = require('events')
const MpvClient = require('./MpvClient')
const Subprocess = require('./Subprocess')
const log = require('./Logger').getLogger(__filename)
const { PromiseTimeout } = require('./Timeout')

const COMMAND_STOP = ['stop']
const COMMAND_PAUSE = ['cycle', 'pause']
const COMMAND_NEXT = ['playlist_next']
const COMMAND_VOLUME_UP = ['add', 'volume', 5]
const COMMAND_VOLUME_DOWN = ['add', 'volume', -5]
const COMMAND_GET_TITLE = ['get_property', 'media-title']

class MpvProcess extends EventEmitter {
  constructor ({
    binary = 'mpv',
    args = [],
    socketPath = '/tmp/mpv.sock',
    timeout = 1000
  } = {}) {
    super()
    this.binary = binary
    this.args = args
    this.socketPath = socketPath
    this.promiseTimeout = new PromiseTimeout(timeout)
    this.events = new EventEmitter()

    this.mpvProcess = null
    this.mpvClient = null

    this._handleEvent = this._handleEvent.bind(this)
    this._handleExit = this._handleExit.bind(this)
  }

  async _maybeInit () {
    if (!this.mpvProcess) {
      await this.spawn()
    }
    if (!this.mpvClient) {
      await this.createMpvClient()
    }
  }

  async createMpvClient () {
    const { socketPath } = this
    await this.closeMpvClient()
    this.mpvClient = new MpvClient({ socketPath })
    this.mpvClient.on('event', this._handleEvent)
    await this.mpvClient.connect()
  }

  async closeMpvClient () {
    if (!this.mpvClient) {
      return
    }
    await this.mpvClient.close()
    this.mpvClient.removeAllListeners()
    this.mpvClient = null
  }

  _handleEvent (event) {
    this.emit('event', event)
    if (event.event) {
      this.events.emit('*', event)
      this.events.emit(event.event, event)
    }
  }

  _handleExit (code) {
    this.mpvProcess.removeAllListeners()
    this.mpvProcess = null
    this.closeMpvClient()
  }

  async kill () {
    await this.closeMpvClient()
    if (this.mpvProcess) {
      await this.mpvProcess.kill()
      this.mpvProcess = null
    }
  }

  async sendCommand (command) {
    log('sendCommand() command: %s', command)
    await this._maybeInit()
    await this.mpvClient.writeAndRead(command)
  }

  async play (url) {
    return this.sendCommand(['loadfile', url])
  }

  async pause () {
    return this.sendCommand(COMMAND_PAUSE)
  }

  async stop () {
    return this.sendCommand(COMMAND_STOP)
  }

  async next () {
    return this.sendCommand(COMMAND_NEXT)
  }

  async volumeUp () {
    return this.sendCommand(COMMAND_VOLUME_UP)
  }

  async volumeDown () {
    return this.sendCommand(COMMAND_VOLUME_DOWN)
  }

  async getTitle () {
    return this.sendCommand(COMMAND_GET_TITLE)
  }

  async spawn () {
    log('spawn()')
    if (this.mpvProcess) {
      throw new Error('Mpv already running!')
    }
    const { binary, socketPath } = this

    const args = [
      ...this.args,
      '--input-unix-socket', socketPath,
      '--quiet',
      '--idle',
      './blank.wav'
    ]

    const mpvProcess = this.mpvProcess = new Subprocess(binary, args)

    mpvProcess.on('exit', this._handleExit)
    await mpvProcess.spawn()
    await this.closeMpvClient()
    await this.createMpvClient()
  }
}

module.exports = MpvProcess
