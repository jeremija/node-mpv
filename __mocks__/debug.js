jest.unmock('debug')
process.env.DEBUG = 'node-mpv:*'
const path = require('path')
const fs = require('fs')
const util = require('util')
const debug = require('debug')

const file = path.join(__dirname, '..', 'test.log')

debug.log = function log () {
  fs.appendFileSync(file, util.format.apply(util, arguments) + '\n')
}

debug('node-mpv:test')('\n\n *** starting tests ***\n\n')

module.exports = debug
