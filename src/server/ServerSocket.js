const log = require('./Logger').getLogger('ServerSocket')

class ServerSocket {
  constructor ({ socket, mpv }) {
    this.mpv = mpv
    socket.on('url', this.handleUrl.bind(this))
  }
  handleUrl (url) {
    const { mpv } = this
    log('url set to:', url)
    mpv.play(url)
  }
}

module.exports = ServerSocket
