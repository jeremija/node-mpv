const EventEmitter = require('events')
const ServerSocket = require('./ServerSocket')

describe('ServerSocket', () => {

  let socket, mpv
  beforeEach(() => {
    mpv = {
      play: jest.fn()
    }
    socket = new EventEmitter()
  })

  describe('url', () => {
    it('calls mpv.play with url', () => {
      const ss = new ServerSocket({ socket, mpv })
      expect(ss).toBeTruthy()
      const url = 'https://test'
      socket.emit('url', url)
      expect(mpv.play.mock.calls).toEqual([[ url ]])
    })
  })
})
