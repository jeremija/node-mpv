jest.mock('youtube-node', () => {
  class YT {
    constructor () {
      YT.mock.instances.push(this)
    }
    setKey (key) {
      this.key = key
    }
    search (title, count, callback) {
      callback(null, {
        items: [{
          kind: 'youtube#searchResult',
          etag: 'etag',
          id: {
            kind: 'string',
            videoId: 'string',
            channelId: 'string',
            playlistId: 'string'
          },
          snippet: {
            publishedAt: 'datetime',
            channelId: 'string',
            title: 'string',
            description: 'string',
            thumbnails: {},
            channelTitle: 'string',
            liveBroadcastContent: 'string'
          }
        }]
      })
    }
  }
  YT.mock = {
    instances: []
  }
  return YT
})

const YouTube = require('./YouTube')
const YT = require('youtube-node')

describe('YouTube', () => {

  const apiKey = 'test1234'

  describe('yt', () => {
    it('creates an instance and sets the key', async () => {
      const yt = new YouTube({ apiKey })
      expect(YT.mock.instances.length).toBe(1)
      const result = await yt.search({ title: 'test' })
      expect(result).toEqual(jasmine.any(Array))
    })
  })

})
