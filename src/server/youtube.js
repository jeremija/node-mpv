'use strict'
const Bluebird = require('bluebird')
const YT = require('youtube-node')

class YouTube {
  constructor ({ apiKey }) {
    let yt = new YT()
    yt.setKey(apiKey)
    this.yt = Bluebird.promisifyAll(yt)
  }
  search ({ title, count = 10 }) {
    return this.yt.searchAsync(title, count)
    .then(result => result.items)
  }
}

module.exports = YouTube
