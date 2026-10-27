import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
const [{ app }, { User, Result }] = await Promise.all([import('./server.js'), import('./models.js')]);
const originals = {
  readyState: mongoose.connection.readyState,
  exists: User.exists, create: User.create,
  find: Result.find, findOne: Result.findOne,
};
let server;
let baseUrl;
let historyFilter;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  mongoose.connection.readyState = originals.readyState;
  User.exists = originals.exists;
  User.create = originals.create;
  Result.find = originals.find;
  Result.findOne = originals.findOne;
});

test('private history rejects guests', async () => {
  const response = await fetch(`${baseUrl}/api/history`);
  assert.equal(response.status, 401);
});

test('history uses the session identity even if a request supplies another userId', async () => {
  const user = { id: 'session-player', username: 'trainer', avatar: '⚡', experience: 0, achievements: [] };
  mongoose.connection.readyState = 1;
  User.exists = async () => false;
  User.create = async () => user;
  Result.find = (filter) => {
    historyFilter = filter;
    return { sort: () => ({ limit: () => ({ lean: async () => [] }) }) };
  };
  Result.findOne = () => ({ sort: () => ({ lean: async () => null }) });

  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'trainer', password: 'secure-password' }),
  });
  assert.equal(registration.status, 201);
  const cookie = registration.headers.get('set-cookie')?.split(';')[0];
  const response = await fetch(`${baseUrl}/api/history?userId=someone-else`, { headers: { cookie } });
  assert.equal(response.status, 200);
  assert.deepEqual(historyFilter, { user: 'session-player' });
  assert.deepEqual((await response.json()).results, []);
});