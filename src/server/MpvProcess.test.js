jest.mock('debug')
jest.mock('./MpvClient')
const MpvProcess = require('./MpvProcess')
const MpvClient = require('./MpvClient')

describe('MpvProcess', () => {

  let mpv
  const binary = 'node'
  const args = ['-e', 'console.log("test"); setTimeout(() => {}, 10000']
  const socketPath = '/tmp/sock'
  const createProcess = async () => {
    mpv = new MpvProcess({ binary, args, socketPath })
    await mpv.spawn()
  }

  beforeEach(() => {
    MpvClient.mockClear()
    MpvClient.prototype.on.mockClear()
  })

  afterEach(async () => {
    let _mpv = mpv
    mpv = null
    _mpv && await _mpv.kill()
  })

  describe('constructor', () => {
    it('sets default params', () => {
      mpv = new MpvProcess()
      expect(mpv.binary).toEqual('mpv')
      expect(mpv.args).toEqual([])
    })

    it('allows custom arguments', () => {
      const binary = 'test'
      const args = [1, 2]
      const socketPath = '/tmp/sock'
      mpv = new MpvProcess({ binary, args, socketPath })
      expect(mpv.binary).toEqual(binary)
      expect(mpv.args).toEqual(args)
      expect(mpv.socketPath).toEqual(socketPath)
    })
  })

  describe('spawn', () => {
    it('spawns a new process', async () => {
      await createProcess()
    })

    it('fails when called twice', async () => {
      await createProcess()
      let error
      try {
        await mpv.spawn()
      } catch (err) {
        error = err
      }
      expect(error).toBeTruthy()
      expect(error.message).toMatch(/already/)
    })
  })

  describe('commands', () => {
    beforeEach(async () => {
      await createProcess()
    })
    ;['play', 'pause', 'stop', 'next', 'volumeUp', 'volumeDown', 'getTitle']
    .forEach(command => {
      it(`sends a ${command} command`, async () => {
        expect(MpvClient.mock.instances.length).toBe(1)
        const mpvClient = MpvClient.mock.instances[0]
        await mpv[command]()
        expect(mpvClient.writeAndRead.mock.calls.length).toBe(1)
        expect(mpvClient.on.mock.calls).toEqual([[
          'event', mpv._handleEvent
        ]])
      })
    })
  })

  describe('_maybeInit', () => {
    it('does not init twice', async () => {
      mpv = new MpvProcess({ binary, args, socketPath })
      await mpv._maybeInit()
      await mpv.closeMpvClient()
      await mpv._maybeInit()
    })
  })

  describe('_handleEvent', () => {

    it('emits event', done => {
      const event = {error: 'success'}
      mpv = new MpvProcess()
      mpv.on('event', e => {
        expect(e).toEqual(event)
        done()
      })
      mpv._handleEvent(event)
    })

    it('emits event by name if property is there', done => {
      const event = {event: 'test', error: 'success'}
      mpv = new MpvProcess()
      mpv.events.on('test', e => {
        expect(e).toEqual(event)
        done()
      })
      mpv._handleEvent(event)
    })
  })

  // describe('kill', () => {
  //   it('does not fail when nothing running', async () => {
  //     mpv = new MpvProcess()
  //     await mpv.kill()
  //   })
  // })
})
