module.exports = class CausedError extends Error {
  constructor (message, cause) {
    super(message)
    Error.captureStackTrace(this, CausedError)
    this.name = this.constructor.name
    this.cause = cause
    this.stack += '\nCaused by: ' + cause.stack
  }
}
