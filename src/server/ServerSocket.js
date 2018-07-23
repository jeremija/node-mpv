const log = require('./Logger').getLogger('ServerSocket')

class ServerSocket {
  constructor ({ socket, mpv }) {
    this.mpv = mpv

    this.handleUrl = this.handleUrl.bind(this)

    socket.on('url', this.handleUrl)
  }
  handleUrl (url) {
    const { mpv } = this
    log('url set to:', url)
    mpv.play(url)
  }
}

module.exports = ServerSocket
