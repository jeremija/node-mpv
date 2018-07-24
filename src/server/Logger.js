const debug = require('debug')
const path = require('path')

class Logger {
  constructor (name) {
    this.name = name
  }
  getLogger (name) {
    name = path.basename(name)
    const _log = debug(`${this.name}:${name}`)
    return function log () {
      _log.apply(null, arguments)
    }
  }
}

module.exports = new Logger('node-mpv')
