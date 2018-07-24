const EventEmitter = require('events')
const childProcess = require('child_process')
const log = require('./Logger').getLogger(__filename)
const { PromiseTimeout } = require('./Timeout')

class Subprocess extends EventEmitter {
  constructor (binary, args = [], { timeout = 5000 } = {}) {
    super()
    this.binary = binary
    this.args = args

    this.promiseTimeout = new PromiseTimeout(timeout)

    this.pid = null
    this.subprocess = null
    this.exited = false
    this.exitCode = null
    this.error = null

    this._handleError = this._handleError.bind(this)
    this._handleExit = this._handleExit.bind(this)
  }

  _handleError (err) {
    log('_handleError() %s', err.message)
    this.error = err
  }

  _handleExit (code) {
    log('_handleExit() code: %d', code)
    this.subprocess.stdout.removeAllListeners()
    this.subprocess.removeAllListeners()
    this.subprocess = null
    this.pid = null
    this.exited = true
    this.exitCode = code
    this.emit('exit')
  }

  async kill () {
    if (!this.subprocess) {
      log('kill() no subprocess')
      return
    }
    log('kill()')

    try {
      await this._kill('SIGTERM')
    } catch (err) {
      await this._kill('SIGKILL')
    }
  }

  async _kill (signal) {
    const { subprocess } = this
    log('_kill() signal: %s', signal)

    let cleanup
    const promise = new Promise((resolve, reject) => {
      const onError = err => {
        log('_kill() error: %s', err.message)
        reject(err)
      }
      const onExit = () => {
        log('_kill() "exit"')
        resolve()
      }
      cleanup = () => {
        subprocess.removeListener('error', onError)
        subprocess.removeListener('exit', onExit)
      }
      subprocess.once('error', onError)
      subprocess.once('exit', onExit)
    })

    subprocess.kill(signal)

    return this.promiseTimeout.handle(promise, {
      action: signal,
      cleanup
    })
  }

  async spawn () {
    if (this.subprocess) {
      throw new Error('Process already exists')
    }
    log('spawn() %s %j', this.binary, this.args)
    this.error = null
    this.exited = false
    this.exitCode = null
    this.subprocess = childProcess.spawn(this.binary, this.args)
    this.pid = this.subprocess.pid

    const subprocess = this.subprocess
    log('spawn() pid: %s', subprocess.pid)

    let cleanup
    const promise = new Promise((resolve, reject) => {
      const onData = data => {
        log('spawn() onData resolving promise', data.toString())
        cleanup()
        resolve()
      }
      const onError = err => {
        log('spawn() onError: %s', err.message)
        cleanup()
        reject(err)
      }
      const onExit = code => {
        log('spawn() onExit: %d', code)
        cleanup()
        reject(new Error('Process exited with code: ' + code))
      }
      cleanup = () => {
        subprocess.stdout.removeListener('data', onData)
        subprocess.stderr.removeListener('data', onData)
        subprocess.removeListener('error', onError)
        subprocess.removeListener('exit', onExit)
      }

      subprocess.stdout.once('data', onData)
      subprocess.stderr.once('data', onData)
      subprocess.once('error', onError)
      subprocess.on('exit', this._handleExit)
      subprocess.once('exit', onExit)
      subprocess.on('error', this._handleError)
    })

    return this.promiseTimeout.handle(promise, {
      action: 'spawn',
      cleanup: async () => {
        cleanup()
        await this.kill()
      }
    })
  }
}

module.exports = Subprocess
