process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');

let mongod;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const alice = { name: 'Alice', email: 'alice@example.com', password: 'secret123' };
const bob = { name: 'Bob', email: 'bob@example.com', password: 'secret123' };

test('health check responds', async () => {
  const res = await request(app).get('/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'ok');
});

test('unknown routes return JSON 404', async () => {
  const res = await request(app).get('/api/nope');
  assert.strictEqual(res.status, 404);
  assert.match(res.body.message, /Route not found/);
});

test('auth: register, duplicate email, login, and /me', async () => {
  const reg = await request(app).post('/api/auth/register').send(alice);
  assert.strictEqual(reg.status, 201);
  assert.ok(reg.body.token, 'register returns a token');
  assert.strictEqual(reg.body.user.email, 'alice@example.com');
  assert.strictEqual(reg.body.user.password, undefined, 'password hash is never returned');

  const dup = await request(app).post('/api/auth/register').send(alice);
  assert.strictEqual(dup.status, 409);

  const missing = await request(app).post('/api/auth/register').send({ email: 'x@y.z' });
  assert.strictEqual(missing.status, 400);

  const bad = await request(app)
    .post('/api/auth/login')
    .send({ email: alice.email, password: 'wrong' });
  assert.strictEqual(bad.status, 401);

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: alice.email, password: alice.password });
  assert.strictEqual(login.status, 200);
  assert.ok(login.body.token);

  const me = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${login.body.token}`);
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.user.email, alice.email);
});

test('auth middleware rejects missing and malformed tokens', async () => {
  const none = await request(app).post('/api/posts').send({ title: 'x', content: 'y' });
  assert.strictEqual(none.status, 401);

  const junk = await request(app)
    .post('/api/posts')
    .set('Authorization', 'Bearer not-a-real-token')
    .send({ title: 'x', content: 'y' });
  assert.strictEqual(junk.status, 401);
  assert.strictEqual(junk.body.message, 'Invalid token');

  const malformed = await request(app)
    .post('/api/posts')
    .set('Authorization', 'Token abc')
    .send({ title: 'x', content: 'y' });
  assert.strictEqual(malformed.status, 401);
});

test('posts: full CRUD plus ownership rules', async () => {
  const aliceToken = (await request(app).post('/api/auth/login').send(alice)).body.token;
  const bobToken = (await request(app).post('/api/auth/register').send(bob)).body.token;

  const created = await request(app)
    .post('/api/posts')
    .set('Authorization', `Bearer ${aliceToken}`)
    .send({ title: 'Express basics', content: 'Routing and middleware', tags: ['Node', 'API'] });
  assert.strictEqual(created.status, 201);
  assert.deepStrictEqual(created.body.tags, ['node', 'api'], 'tags are lowercased by the schema');
  const postId = created.body._id;

  const invalid = await request(app)
    .post('/api/posts')
    .set('Authorization', `Bearer ${aliceToken}`)
    .send({ title: 'no content' });
  assert.strictEqual(invalid.status, 400, 'schema validation errors become 400');

  const list = await request(app).get('/api/posts?limit=5');
  assert.strictEqual(list.status, 200);
  assert.strictEqual(list.body.total, 1);
  assert.strictEqual(list.body.items[0].author.name, 'Alice', 'author is populated');
  assert.strictEqual(list.body.items[0].author.password, undefined);

  const filtered = await request(app).get('/api/posts?tag=node');
  assert.strictEqual(filtered.body.total, 1);
  const noMatch = await request(app).get('/api/posts?tag=python');
  assert.strictEqual(noMatch.body.total, 0);

  const one = await request(app).get(`/api/posts/${postId}`);
  assert.strictEqual(one.status, 200);
  assert.strictEqual(one.body.title, 'Express basics');

  const badId = await request(app).get('/api/posts/not-an-object-id');
  assert.strictEqual(badId.status, 400, 'CastError becomes 400, not 500');

  const missing = await request(app).get(`/api/posts/${new mongoose.Types.ObjectId()}`);
  assert.strictEqual(missing.status, 404);

  const updated = await request(app)
    .put(`/api/posts/${postId}`)
    .set('Authorization', `Bearer ${aliceToken}`)
    .send({ title: 'Express basics, revised' });
  assert.strictEqual(updated.status, 200);
  assert.strictEqual(updated.body.title, 'Express basics, revised');
  assert.strictEqual(updated.body.content, 'Routing and middleware', 'untouched fields survive');

  const forbidden = await request(app)
    .put(`/api/posts/${postId}`)
    .set('Authorization', `Bearer ${bobToken}`)
    .send({ title: 'hijacked' });
  assert.strictEqual(forbidden.status, 403);

  const forbiddenDelete = await request(app)
    .delete(`/api/posts/${postId}`)
    .set('Authorization', `Bearer ${bobToken}`);
  assert.strictEqual(forbiddenDelete.status, 403);
});

test('comments: nested CRUD and cascade delete with the parent post', async () => {
  const aliceToken = (await request(app).post('/api/auth/login').send(alice)).body.token;
  const bobToken = (await request(app).post('/api/auth/login').send(bob)).body.token;

  const post = (await request(app)
    .post('/api/posts')
    .set('Authorization', `Bearer ${aliceToken}`)
    .send({ title: 'Mongoose models', content: 'Schemas and refs' })).body;

  const comment = await request(app)
    .post(`/api/posts/${post._id}/comments`)
    .set('Authorization', `Bearer ${bobToken}`)
    .send({ body: 'Great write-up' });
  assert.strictEqual(comment.status, 201);
  const commentId = comment.body._id;

  const unauth = await request(app)
    .post(`/api/posts/${post._id}/comments`)
    .send({ body: 'anonymous' });
  assert.strictEqual(unauth.status, 401);

  const onMissingPost = await request(app)
    .post(`/api/posts/${new mongoose.Types.ObjectId()}/comments`)
    .set('Authorization', `Bearer ${bobToken}`)
    .send({ body: 'orphan' });
  assert.strictEqual(onMissingPost.status, 404);

  const list = await request(app).get(`/api/posts/${post._id}/comments`);
  assert.strictEqual(list.status, 200);
  assert.strictEqual(list.body.total, 1);
  assert.strictEqual(list.body.items[0].author.name, 'Bob');

  const single = await request(app).get(`/api/comments/${commentId}`);
  assert.strictEqual(single.status, 200);

  const wrongOwner = await request(app)
    .put(`/api/comments/${commentId}`)
    .set('Authorization', `Bearer ${aliceToken}`)
    .send({ body: 'edited by the wrong user' });
  assert.strictEqual(wrongOwner.status, 403);

  const edited = await request(app)
    .put(`/api/comments/${commentId}`)
    .set('Authorization', `Bearer ${bobToken}`)
    .send({ body: 'Great write-up, thanks!' });
  assert.strictEqual(edited.status, 200);
  assert.strictEqual(edited.body.body, 'Great write-up, thanks!');

  // Deleting the post should take its comments with it.
  const del = await request(app)
    .delete(`/api/posts/${post._id}`)
    .set('Authorization', `Bearer ${aliceToken}`);
  assert.strictEqual(del.status, 200);

  const gone = await request(app).get(`/api/comments/${commentId}`);
  assert.strictEqual(gone.status, 404, 'comments are removed with their post');
});

test('comments: an author can delete their own comment', async () => {
  const aliceToken = (await request(app).post('/api/auth/login').send(alice)).body.token;

  const post = (await request(app)
    .post('/api/posts')
    .set('Authorization', `Bearer ${aliceToken}`)
    .send({ title: 'Temp', content: 'Temp body' })).body;

  const comment = (await request(app)
    .post(`/api/posts/${post._id}/comments`)
    .set('Authorization', `Bearer ${aliceToken}`)
    .send({ body: 'my own note' })).body;

  const del = await request(app)
    .delete(`/api/comments/${comment._id}`)
    .set('Authorization', `Bearer ${aliceToken}`);
  assert.strictEqual(del.status, 200);

  const after = await request(app).get(`/api/posts/${post._id}/comments`);
  assert.strictEqual(after.body.total, 0);
});
