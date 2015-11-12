'use strict';
let helpers = require('app/src/server/helpers.js');
let expect = require('chai').expect;

function str2ab(str) {
  let buf = new ArrayBuffer(str.length * 2);
  let bufView = new Uint16Array(buf);
  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

describe('test/server/helpers-test.js', () => {

  describe('ab2str()', () => {
    it('should convert array buffer to string', () => {
      let arrayBuffer = str2ab('test');
      let string = helpers.ab2str(arrayBuffer);
      expect(string).to.equal('test');
    });
  });

});

