'use strict'
const Bluebird = require('bluebird')
const YT = require('youtube-node')

class YouTube {
  constructor ({ apiKey }) {
    const yt = new YT()
    yt.setKey(apiKey)
    this.yt = Bluebird.promisifyAll(yt)
  }
  async search ({ title, count = 10 }) {
    const result = await this.yt.searchAsync(title, count)
    return result.items
  }
}

module.exports = YouTube
