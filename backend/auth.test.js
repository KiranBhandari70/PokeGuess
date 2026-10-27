import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
const [{ app }, { User }] = await Promise.all([import('./server.js'), import('./models.js')]);
const originalReadyState = mongoose.connection.readyState;
const originalFindOne = User.findOne;
let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  mongoose.connection.readyState = 1;
  User.findOne = async () => null;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  mongoose.connection.readyState = originalReadyState;
  User.findOne = originalFindOne;
});

test('invalid credentials are rejected without creating a session', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'missing-player', password: 'wrong-password' }),
  });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Username or password is incorrect' });
  assert.equal(response.headers.get('set-cookie'), null);
});

