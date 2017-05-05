'use strict';


describe('Embedza demo', function () {
  var app;

  var PORT    = 5002;
  var request = require('supertest')('http://127.0.0.1:' + PORT);


  before(function (done) {
    app = require('child_process').spawn(
      'node',
      [ '../support/server.js' ],
      {
        cwd: __dirname,
        env: Object.assign({}, process.env, { PORT: PORT }),
        stdio: 'inherit'
      }
    );

    // Wait a bit until app bind port
    setTimeout(done, 1000);
  });


  it('ping root', function () {
    return request
      .get('/')
      .expect(200)
      .expect(/<!DOCTYPE html>/);
  });


  it('resolve url', function () {
    return request
      .get('/?url=https://www.youtube.com/watch?v=AqHZJe6306k')
      .expect(200)
      .expect(/Turn Your Phone 90 Degrees/);
  });


  after(function () {
    if (app) app.kill();
  });
});
