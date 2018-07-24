const { createTimeout, TimeoutError } = require('./Timeout')
jest.useFakeTimers()

describe('Timeout', () => {

  afterEach(() => {
    jest.runAllTimers()
  })

  describe('TimeoutError', () => {

    it('should have stack trace', () => {
      const error = new TimeoutError('test')
      expect(error.stack).toEqual(jasmine.any(String))
    })

    it('should be an instance of TimeoutError', () => {
      const error = new TimeoutError('test')
      expect(error).toEqual(jasmine.any(Error))
      expect(error).toEqual(jasmine.any(TimeoutError))
    })

  })

  describe('createTimeout', () => {
    it('returns a promise that gets rejected after a timeout', async () => {
      const promise = createTimeout(1000)
      jest.runAllTimers()
      let error
      try {
        await promise
      } catch (err) {
        error = err
      }
      expect(error.message).toEqual('The operation timed out after 1000ms')
    })

    it('returns a promise that gets rejected after a timeout', async () => {
      const promise = createTimeout(1000, 'test')
      jest.runAllTimers()
      let error
      try {
        await promise
      } catch (err) {
        error = err
      }
      expect(error.message)
      .toEqual('The operation "test" timed out after 1000ms')
    })
  })

})
