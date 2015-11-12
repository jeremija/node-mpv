'use strict';
let sinon = require('sinon');
let assert = sinon.assert;
let expect = require('chai').expect;
let Youtube = require('app/server/youtube');

describe('test/server/youtube-test.js', () => {
    let youtubeApi, youtube;
    beforeEach(() => {
        youtubeApi = { search: sinon.spy() };
        youtube = new Youtube(youtubeApi);
    });

    describe('Youtube().search()', () => {
        it('should return a promise', () => {
            let ret = youtube.search('my episode');
            expect(ret.then).to.be.a('function');
        });
        it('should have called youtubeApi.search', () => {
            youtube.search('my episode');
            assert.calledWith(youtubeApi.search, 'my episode', 10);
        });
        it('should resolve when all is ok', (done) => {
            let results = {}, err = new Error();
            youtubeApi.search = (title, count, callback) => {
                if (title === 'my episode') callback(undefined, results);
                else callback(err);
            };

            youtube.search('my episode').done((data) => {
                expect(data).to.equal(results);
                done();
            });
        });
    });

});
