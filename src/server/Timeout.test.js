const { createTimeout, PromiseTimeout, TimeoutError } = require('./Timeout')
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
      expect(error.message).toEqual('The action timed out after 1000ms')
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
      .toEqual('The action "test" timed out after 1000ms')
    })
  })

  describe('PromiseTimeout', () => {

    describe('constructor', () => {
      it('sets the default timeout to 1000ms', () => {
        const t = new PromiseTimeout()
        expect(t.timeout).toEqual(1000)
      })

      it('accepts custom timeout value', () => {
        const t = new PromiseTimeout(9)
        expect(t.timeout).toEqual(9)
      })
    })

    describe('handlePromise', () => {
      it('returns the value of promise when it resolves first', async () => {
        const value = 10
        const t = new PromiseTimeout()
        const result = await t.handle(Promise.resolve(value))
        jest.runAllTimers()
        expect(result).toBe(value)
      })

      it('rejects with TimeoutError when it times out', async () => {
        let error
        const promise = new PromiseTimeout().handle(new Promise(jest.fn()))
        jest.runAllTimers()
        try {
          await promise
        } catch (err) {
          error = err
        }
        expect(error).toEqual(jasmine.any(TimeoutError))
        expect(error.message).toEqual('The action timed out after 1000ms')
      })

      it('performs cleanup when defined', async () => {
        const cleanup = jest.fn()
        let error
        const promise = new PromiseTimeout()
        .handle(new Promise(jest.fn()), {
          action: 'test',
          cleanup
        })
        jest.runAllTimers()
        try {
          await promise
        } catch (err) {
          error = err
        }
        expect(error).toEqual(jasmine.any(TimeoutError))
        expect(error.message)
        .toEqual('The action "test" timed out after 1000ms')
        expect(cleanup.mock.calls.length).toBe(1)
      })
    })

  })

})
