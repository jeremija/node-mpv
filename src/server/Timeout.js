class TimeoutError extends Error {
  constructor (message) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, TimeoutError)
  }
}

function createTimeout (timeout = 1000, operation) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const message = operation
        ? `The operation "${operation}" timed out after ${timeout}ms`
        : `The operation timed out after ${timeout}ms`
      reject(new TimeoutError(message), timeout)
    }, timeout)
  })
}

module.exports = { createTimeout, TimeoutError }
