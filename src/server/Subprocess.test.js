const Subprocess = require('./Subprocess')

describe('Subprocess', () => {

  let subprocess
  afterEach(() => {
    const s = subprocess
    subprocess = null
    if (s && s.pid) {
      process.kill(s.pid, 'SIGKILL')
    }
  })

  async function getError (promise) {
    let error
    try {
      await promise
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    return error
  }

  function createSubprocess () {
    return new Subprocess('node', [
      '-e', 'console.log("test"); setTimeout(() => {}, 10000)'
    ], {
      timeout: 500
    })
  }

  describe('spawn', () => {

    it('handles immediate exit error', async () => {
      subprocess = new Subprocess('node', ['-e', 'process.exit()'])
      const error = await getError(subprocess.spawn())
      expect(error.message).toMatch(/Process exited/)
      expect(subprocess.pid).toBe(null)
      expect(subprocess.exited).toBe(true)
    })

    it('handles ENOENT', async () => {
      subprocess = new Subprocess('/non/existing/script')
      const error = await getError(subprocess.spawn())
      expect(error.message).toMatch(/ENOENT/)
    })

    it('resolves on first data from stdout', async () => {
      subprocess = createSubprocess()
      await subprocess.spawn()
      expect(subprocess.exited).toBe(false)
      await subprocess.kill()
      expect(subprocess.exited).toBe(true)
    })

    it('times out when no stdout', async () => {
      subprocess = new Subprocess('node', [
        '-e', 'setTimeout(() => {}, 10000)'
      ], {
        timeout: 100
      })
      const error = await getError(subprocess.spawn())
      expect(error.message).toMatch(/timed out after 100ms/)
    })

    it('throws when spawn is called twice', async () => {
      subprocess = createSubprocess()
      await subprocess.spawn()
      const error = await getError(subprocess.spawn())
      expect(error.message).toEqual('Process already exists')
    })

  })

  describe('kill', () => {

    it('resolves when process exits', async () => {
      subprocess = createSubprocess()
      await subprocess.spawn()
      await subprocess.kill()
      expect(subprocess.pid).toBe(null)
    })

    it('does nothing when no subprocess', async () => {
      subprocess = new Subprocess('node')
      await subprocess.kill()
    })

    it('times out when process cannot be killed', async () => {
      subprocess = new Subprocess('node', [
        '-e',
        `process.on("SIGTERM", () => {});
        console.log("started");
        setTimeout(() => {}, 10000)`
      ], { timeout: 200 })
      await subprocess.spawn()
      const error = await getError(subprocess._kill('SIGTERM'))
      expect(error.message).toMatch(/timed out/)
    })

    it('rejects when process cannot be killed', async () => {
      subprocess = createSubprocess()
      await subprocess.spawn()
      let n = 0
      const origKill = subprocess.subprocess.kill
      // hack to emit error during kill in the lack of a better way
      subprocess.subprocess.kill = (signal) => {
        n += 1
        n === 1 && subprocess.subprocess.emit('error', new Error('test error'))
        origKill.call(subprocess.subprocess, signal)
      }
      const error = await getError(subprocess._kill('SIGINT'))
      expect(error.message).toMatch(/test error/)
    })

    it('calls SIGKILL when SIGTERM fails', async () => {
      subprocess = new Subprocess('node', [
        '-e',
        `process.on("SIGTERM", () => {});
        console.log("started");
        setTimeout(() => {}, 10000)`
      ], { timeout: 200 })
      await subprocess.spawn()
      await subprocess.kill()
    })

  })

})
