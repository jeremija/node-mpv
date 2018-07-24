jest.mock('debug')
const MpvClient = require('./MpvClient')
const log = require('./Logger').getLogger(__filename)
const fs = require('fs')
const net = require('net')
const os = require('os')
const path = require('path')

jest.useRealTimers()
jest.setTimeout(500)

describe('MpvClient', () => {

  const dir = os.tmpdir()
  const socketPath = path.join(dir, 'test.sock')
  beforeAll(done => {
    fs.unlink(socketPath, callback => done())
  })

  let server
  beforeEach(done => {
    server = net.createServer()
    server.listen(socketPath, done)
  })

  afterEach(done => {
    if (server.listening) {
      log('afterEach server.close()')
      server.close(done)
    }
  })

  describe('constructor', () => {
    it('sets default socketPath to /tmp/mpv.sock', () => {
      const client = new MpvClient()
      expect(client.socketPath).toEqual('/tmp/mpv.sock')
    })
  })

  describe('connect', () => {

    let client
    afterEach(async () => {
      log('afterEach client.close()')
      await client.close()
    })

    it('connects to the socket and emits data', async () => {
      client = new MpvClient({ socketPath })
      await client.connect()
    })

    it('rejects the promise on error', async () => {
      const socketPath = path.join(dir, 'invalid.sock')
      client = new MpvClient({ socketPath })
      let error
      try {
        await client.connect()
      } catch (err) {
        error = err
      }
      expect(error).toBeTruthy()
      expect(error.message).toMatch(/ENOENT/)
    })

    it('times out after a while', async () => {
      client = new MpvClient({ socketPath, timeout: 0 })
      let error
      try {
        log('connecting')
        const promise = client.connect()
        // hack to remove the connect event listener. simulates a timeout
        client.client.removeAllListeners('connect')
        await promise
      } catch (err) {
        log('error', err)
        error = err
      }
      expect(error).toBeTruthy()
      expect(error.message)
      .toEqual('The action "connect" timed out after 0ms')
    })

    describe('write', () => {
      beforeEach(async () => {
        client = new MpvClient({ socketPath })
      })

      it('sends the data to server and returns a promise', async () => {
        const data = { test: 'value' }
        const promise = new Promise((resolve, reject) => {
          server.on('connection', s => {
            s.once('data', resolve)
            s.once('error', reject)
          })
        })
        await client.connect()
        await client.write(data)
        const result = await promise
        expect(result.toString('utf8'))
        .toEqual(JSON.stringify({ command: data }) + '\n')
      })

      it('rejects the promise on error', async () => {
        // close server on first connection
        const promise = new Promise(resolve => {
          server.on('connection', s => {
            s.end()
            s.destroy()
            resolve()
          })
        })
        const data = { test: 'value' }
        let error
        await client.connect()
        await promise
        try {
          // connection should be closed by now
          await client.write(data)
        } catch (err) {
          error = err
        }
        expect(error).toBeTruthy()
        expect(error.message).toMatch(/^Error writing message/g)
      })
    })

    describe('writeAndRead', () => {
      beforeEach(() => {
        client = new MpvClient({ socketPath })
      })

      it('sends data to server and reads immediatelly', async () => {
        const data = { message: 'ping' }
        server.on('connection', s => {
          s.once('data', async data => {
            data = JSON.parse(data.toString('utf8').trim())
            s.write(JSON.stringify({
              message: 'pong',
              error: 'success'
            }) + '\n')
          })
        })
        await client.connect()
        const result = await client.writeAndRead(data)
        expect(result).toEqual({ message: 'pong', error: 'success' })
      })

      it('rejects the promise when error !== success in response', async () => {
        const data = { message: 'ping' }
        server.on('connection', s => {
          s.once('data', async data => {
            data = JSON.parse(data.toString('utf8').trim())
            s.write(JSON.stringify({ error: 'some kind of failure' }) + '\n')
          })
        })
        await client.connect()
        let error
        try {
          await client.writeAndRead(data)
        } catch (err) {
          error = err
        }
        expect(error).toBeTruthy()
        expect(error.message).toMatch(/some kind of failure/)
      })

      it('handles an error which occurrs when waiting for event', async () => {
        const data = { message: 'ping' }
        server.on('connection', s => {
          s.on('data', value => {
            s.end()
            s.destroy()
          })
        })
        client = new MpvClient({ socketPath })
        await client.connect()
        let error
        try {
          await client.writeAndRead(data)
        } catch (err) {
          error = err
        }
        expect(error).toBeTruthy()
        expect(error.message).toMatch(/closed while waiting for response/)
      })
    })

    describe('close', () => {
      it('does not fail when connection not open', async () => {
        client = new MpvClient({ socketPath })
        await client.close()
      })

      it('closes the socket connection', async () => {
        client = new MpvClient({ socketPath })
        await client.connect()
        await client.close()
      })

    })
  })

})
