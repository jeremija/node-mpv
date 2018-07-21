'use strict';
let express = require('express');
let middleware = require('../../src/server/middleware.js');
let request = require('supertest');
let youtubeConfig = require('../../src/server/youtube.js');

describe('test/server/middleware-test.js', () => {
  let app;
  let result = {items: [{id: {videoId: 'xbg9fd7zzb'}}]};
  let err = new Error('our error');
  beforeEach(() => {
    app = express();
    let youtubeApi = {
      search: function(title, count, callback) {
        if (title === 'my title' && count === 10) callback(undefined, result);
        else callback(err);
      }
    };
    let youtube = youtubeConfig(youtubeApi);
    app.use(middleware(youtube));
  });

  describe('GET /youtube/search', () => {
    it('should return status 500 on error', done => {
      request(app).get('/youtube/search?value=a+custom+title')
        .expect('Content-Type', /json/)
        .expect(500, {error: 'our error'})
        .end(done);
    });
    it('should return status 200 and results on success', done => {
      request(app).get('/youtube/search?value=my+title')
        .expect('Content-Type', /json/)
        .expect(200, result.items)
        .end(done);
    });
  });
});
