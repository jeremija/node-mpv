'use strict'
const EventEmitter = require('events')
const MpvClient = require('./MpvClient.js')
const Promise = require('bluebird')
const childProcess = require('child_process')
const log = require('./Logger').getLogger('Mpv')

const COMMAND_STOP = ['stop']
const COMMAND_PAUSE = ['cycle', 'pause']
const COMMAND_NEXT = ['playlist_next']
const COMMAND_VOLUME_UP = ['add', 'volume', 5]
const COMMAND_VOLUME_DOWN = ['add', 'volume', -5]
const COMMAND_GET_TITLE = ['get_property', 'media-title']

class Mpv extends EventEmitter {
  constructor ({
    mpvBinary = 'mpv',
    mpvArgs = [],
    socketPath = '/tmp/mpv.sock'
  } = {}) {
    super()
    this.mpvBinary = mpvBinary
    this.mpvArgs = mpvArgs
    this.socketPath = socketPath

    this.mpvProcess = null
    this.mpvClient = null

    this.handleEvent = this.handleEvent.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  async maybeInit () {
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

    this.mpvClient.on('event', this.handleEvent)
    this.mpvClient.on('error', this.handleError)

    await this.mpvClient.connect()
  }

  async closeMpvClient () {
    if (!this.mpvClient) {
      return
    }
    await this.mpvClient.close()
    this.mpvClient = null
  }

  handleEvent (event) {
    this.emit('event', event)
    if (event.event) {
      this.emit(event.event, event)
    }
  }

  async handleError (err) {
    log('Got an error from MpvClient: %s', err.stack)
    try {
      await this.closeMpvClient()
    } catch (err) {
      log('Error closing MpvClient: %s', err.stack)
    }
  }

  async kill () {
    if (this.mpvProcess) {
      const promise = new Promise((resolve, reject) => {
        this.mpvProcess.once('error', err => {
          // Listeners that were attached during creatinn should take care of
          // removnig all linsteners
          reject(err)
        })

        this.mpvProcess.once('exit', () => {
          // Listeners that were attached during creatinn should take care of
          // removnig all linsteners
          resolve()
        })
      })
      this.mpvProcess.kill('SIGHUP')
      this.mpvProcess = null
      await promise
    }
    await this.closeMpvClient()
    return this
  }

  async sendCommand (command) {
    log('sendCommand: ', command)
    await this.maybeInit()
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
    if (this.mpvProcess) {
      throw new Error('Mpv already running!')
    }

    const {
      mpvBinary,
      mpvArgs,
      socketPath
    } = this

    const args = [
      ...mpvArgs,
      '--input-unix-socket', socketPath,
      '--quiet',
      '--idle',
      './blank.wav'
    ]

    log('Starting mpv with args: %s %s', mpvBinary, args.join(' '))

    const mpvProcess = this.mpvProcess = childProcess.spawn(mpvBinary, args)

    // mpv.stdin.setEncoding('utf-8');

    await this.closeMpvClient()
    await new Promise((resolve, reject) => {
      mpvProcess.stdout.once('data', data => {
        resolve()
      })

      mpvProcess.once('error', err => {
        log('An error occurred while starting mpv: ' + err.message)
        mpvProcess.removeAllListeners()
        mpvProcess.stdout.removeAllListeners()
        reject(err)
      })

      mpvProcess.once('exit', code => {
        log('mpv exited with code: %s', code)
        mpvProcess.removeAllListeners()
        mpvProcess.stdout.removeAllListeners()
        this.mpvProcess = null
        // TODO do I need to resolve or reject here somewhere?
      })
    })

  }
}

module.exports = Mpv
