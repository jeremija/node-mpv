'use strict'
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

class Mpv {
  constructor ({
    mpvBinary = 'mpv',
    mpvArgs = [],
    socketPath = '/tmp/mpv.sock'
  } = {}) {
    this.mpvBinary = mpvBinary
    this.mpvArgs = mpvArgs
    this.socketPath = socketPath

    this.mpvProcess = null
    this.mpvClient = null
  }

  stopMpvSocket () {
    if (!this.mpvClient) {
      return
    }
    this.mpvClient.close()
    this.mpvClient = null
  }

  kill () {
    if (this.mpvProcess) {
      this.mpvProcess.kill('SIGHUP')
      this.mpvProcess = null
    }
    this.stopMpvSocket()
    return this
  }

  async sendCommand (command) {
    log('sending command', command)
    await this.mpvClient.writeAndRead(command)
  }

  async play (url) {
    this.maybeSpawn()
    return this.sendCommand(['loadfile', url])
  }

  async pause () {
    this.maybeSpawn()
    return this.sendCommand(COMMAND_PAUSE)
  }

  async stop () {
    this.maybeSpawn()
    return this.sendCommand(COMMAND_STOP)
  }

  async next () {
    this.maybeSpawn()
    return this.sendCommand(COMMAND_NEXT)
  }

  async volumeUp () {
    this.maybeSpawn()
    return this.sendCommand(COMMAND_VOLUME_UP)
  }

  async volumeDown () {
    this.maybeSpawn()
    return this.sendCommand(COMMAND_VOLUME_DOWN)
  }

  async maybeSpawn () {
    if (!this.mpvProcess) {
      return this.spawn()
    }
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
      '--input-unix-socket',
      socketPath || '/tmp/mpvsocket',
      '--quiet',
      '--idle',
      './blank.wav'
    ]

    log('starting mpv instance...')
    log('command:', mpvBinary, args.join(' '))

    const mpvProcess = this.mpvProcess = childProcess.spawn(mpvBinary, args)

    // mpv.stdin.setEncoding('utf-8');

    await new Promise((resolve, reject) => {
      mpvProcess.stdout.once('data', data => {
        resolve()
      })

      mpvProcess.once('error', err => {
        log('An error occurred while starting mpv: ' + err.message)
        reject(err)
      })

      mpvProcess.once('close', function (code) {
        log('mpv exited with code ' + code)
        this.mpvProcess = null
        this.stopMpvSocket()
      })
    })

    if (this.mpvClient) {
      this.mpvClient.close()
    }
    this.mpvClient = new MpvClient({ socketPath })
    return this.mpvClient.connect()
  }
}

module.exports = Mpv
