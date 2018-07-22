const debug = require('debug')

class Logger {
  constructor (name) {
    this.name = name
  }
  getLogger (name) {
    const _log = debug(`${this.name}:${name}`)
    return function log () {
      _log.apply(null, arguments)
    }
  }
}

module.exports = new Logger('app')
