'use strict';
let net = require('net');
let expect = require('chai').expect;
let mpvSocketConfig = require('app/server/mpvSocket.js');

let tmpSocketPath = '/tmp/testSocketPath';

describe('test/js/mpvSocket-test.js', () => {
  describe('init()', () => {
    it('should return a new object', () => {
      let s = mpvSocketConfig.init('/my/socket/path');
      expect(s).to.be.ok;
      expect(s.connect).to.be.a('function');
      expect(s.write).to.be.a('function');
      expect(s.addNextListener).to.be.a('function');
      expect(s.clearNextListeners).to.be.a('function');
      expect(s.close).to.be.a('function');
    });
  });

  describe('connect()', function() {
    let s, server, connections;
    beforeEach(() => {
      connections = [];
      s = mpvSocketConfig.init(tmpSocketPath);
      server = undefined;
    });
    afterEach(done => {
      s.close();
      connections.forEach(conn => conn.destroy());
      if (server) server.close(done); else done();
    });
    function createServer(callback) {
      return net.createServer(conn => {
        connections.push(conn);
        callback(conn);
      });
    }
    it('should call callback with error if it cannot connect', done => {
      s.connect((err, data) => { if (err) done(); }, false);
    });
    it('should call callback on every data', done => {
      server = createServer(conn => {
        conn.write('{"a":1}\n{"b":2}\n', 'utf-8');
        conn.write('{"c":3}\n', 'utf-8');
      });
      let allData = [];

      server.listen(tmpSocketPath, () => {
        s.connect((err, data) => {
          if (err) done(err);
          allData.push(data);
          if (allData.length !== 3) return;
          expect(allData).to.eql([ {a: 1}, {b: 2}, {c: 3} ]);
          done();
        });
      });
    });
    it('should call next listeners only once', done => {
      server = createServer(conn => {
        conn.write('{"data":1}\n{"data":2}\n', 'utf-8');
        conn.write('{"data":3}\n', 'utf-8');
      });

      server.listen(tmpSocketPath, () => {
        let singleData, count = 0;
        s.connect((err, data) => {
          if (err) {
            done(err);
            return;
          }
          count++;
          if (data.data === 1) s.addNextListener(item => singleData = item);
          if (count === 3) {
            expect(singleData).to.eql({data: 2});
            done();
          }
        });
      });
    });
    it('should retry until closed', done => {
      let count = 0;
      s.connect((err, data) => {
        count++;
        expect(err).to.be.ok;
        if (count === 3) s.close();
      }, true, 2);

      setTimeout(() => {
        expect(count).to.equal(3);
        done();
      }, 15);
    });
  });

});
