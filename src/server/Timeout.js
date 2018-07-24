const log = require('./Logger').getLogger(__filename)

const noop = () => {}

class TimeoutError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, TimeoutError)
  }
}

async function createTimeout (timeout = 1000, action) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const message = action
        ? `The action "${action}" timed out after ${timeout}ms`
        : `The action timed out after ${timeout}ms`
      reject(new TimeoutError(message), timeout)
    }, timeout)
  })
}

class PromiseTimeout {
  constructor (timeout = 1000) {
    this.timeout = timeout
  }
  async handle (promise, { cleanup = noop, action } = {}) {
    try {
      return await Promise.race([
        promise,
        createTimeout(this.timeout, action)
      ])
    } catch (err) {
      log('withTimeout() error')
      if (err instanceof TimeoutError) {
        log('withTimeout() A timeout error occurred: %s', err.message)
        if (cleanup) {
          await cleanup()
        }
      }
      throw err
    }
  }
}

module.exports = { TimeoutError, createTimeout, PromiseTimeout }
