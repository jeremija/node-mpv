const MpvClient = require('./MpvClient')
const net = require('net')
const os = require('os')
const path = require('path')
// const fs = require('fs')

describe('MpvClient', () => {

  const wrapDone = done => err => {
    if (err) done.fail(err)
    else done()
  }

  // let lastLog = Date.now()
  // const log = (...params) => {
  //   const now = Date.now()
  //   fs.appendFileSync('./test.log', params.join(' ') +
  //     ' [' + (now - lastLog) + 'ms]\n')
  //   lastLog = now
  // }

  const dir = os.tmpdir()
  const socketPath = path.join(dir, 'test.sock')
  let server
  beforeEach(done => {
    server = net.createServer()
    server.listen(socketPath, wrapDone(done))
  })

  afterEach(done => {
    if (server.listening) {
      server.close(wrapDone(done))
    }
  })

  describe('connect', () => {

    const greeting = { a: 'b' }
    let client
    afterEach(async () => {
      await client.close()
    })

    function sendGreeting (socket, callback) {
      // TODO not sure if mpv always greets the client first
      socket.write(JSON.stringify(greeting) + '\n')
    }

    it('connects to the socket and emits data', async () => {
      client = new MpvClient({ socketPath })
      server.on('connection', s => {
        sendGreeting(s)
      })
      const promise = new Promise((resolve, reject) => {
        client.once('event', resolve)
        client.once('error', reject)
      })
      await client.connect()
      const result = await promise
      expect(result).toEqual(greeting)
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

    describe('write', () => {
      beforeEach(async () => {
        client = new MpvClient({ socketPath })
      })

      it('sends the data to server and returns a promise', async () => {
        const data = { test: 'value' }
        const promise = new Promise((resolve, reject) => {
          server.on('connection', s => {
            sendGreeting(s)
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
            sendGreeting(s)
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
          sendGreeting(s)
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

    })

  })

  describe('close', () => {

  })

})
