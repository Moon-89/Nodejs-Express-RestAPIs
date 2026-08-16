# Node.js + Express + MongoDB REST API

A REST API built with Express and Mongoose, with JWT authentication and two related
resources (**posts** and **comments**) on top of the **users** collection that backs auth.

## Stack

| Concern | Choice |
| --- | --- |
| Server | Express 4 |
| Database | MongoDB via Mongoose 7 |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` password hashing |
| Docs | OpenAPI 3.0 spec rendered by Swagger UI at `/docs` |
| Tests | `node:test` + `supertest` + `mongodb-memory-server` |

## Getting started

1. Copy the env file and set a secret:

   ```bash
   cp .env.sample .env
   ```

   | Variable | Purpose |
   | --- | --- |
   | `PORT` | Port to listen on (default `5000`) |
   | `MONGO_URI` | MongoDB connection string |
   | `JWT_SECRET` | **Required** — the app refuses to start without it |
   | `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |

2. Install dependencies and point `MONGO_URI` at a database — see
   [MongoDB Atlas setup](#mongodb-atlas-setup) below, or run a local `mongod`:

   ```bash
   npm install
   npm run db:check   # confirms MONGO_URI connects before you start the server
   ```

3. Run:

   ```bash
   npm run dev          # nodemon against MONGO_URI, reloads on change
   npm start            # plain node against MONGO_URI
   npm run dev:memory   # no MongoDB install needed (data is wiped on restart)
   ```

   `dev:memory` starts a throwaway in-memory MongoDB, so you can try the endpoints
   before setting up a real database. Use `npm run dev` once you have MongoDB
   running locally or a MongoDB Atlas connection string in `.env`.

4. Try it out at <http://localhost:5000/docs> (also `/api/documentation`, and `/` redirects
   there). That page is Swagger UI: every endpoint with its parameters, request body,
   response codes and a working *Try it out*. It reads [`public/openapi.json`](public/openapi.json),
   an OpenAPI 3.0 spec that Postman and code generators can import as well.

5. Run the test suite — it spins up an in-memory MongoDB, so no database setup is needed:

   ```bash
   npm test
   ```

## MongoDB Atlas setup

Atlas is MongoDB's hosted service — nothing to install, and it is the only option that
works once the API is deployed (Vercel cannot reach a database on your laptop).

1. **Create a free cluster.** Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas),
   create a project, then **Build a Cluster** → the **M0 Free** tier. Any region works;
   pick the one closest to you.
2. **Create a database user.** *Database Access* → **Add New Database User** → password
   auth, role **Read and write to any database**. Save the password — Atlas shows it once.
3. **Allow network access.** *Network Access* → **Add IP Address**. Use **Add Current IP
   Address** for local development; add `0.0.0.0/0` as well if you deploy to Vercel,
   whose functions have no fixed IP.
4. **Copy the connection string.** Cluster → **Connect** → **Drivers** → **Node.js**.
   You get something like:

   ```
   mongodb+srv://<user>:<password>@cluster0.abc12.mongodb.net/?retryWrites=true&w=majority
   ```

5. **Put it in `.env`.** Replace `<password>` with the real password, and insert the
   database name before the `?`:

   ```
   MONGO_URI=mongodb+srv://appuser:s3cret@cluster0.abc12.mongodb.net/devweekends?retryWrites=true&w=majority
   ```

   Without the `/devweekends` part Mongoose writes to a database named `test`.
   URL-encode special characters in the password (`@` → `%40`, `#` → `%23`, `/` → `%2F`).

6. **Verify, then run:**

   ```bash
   npm run db:check   # prints the host, database and collections it reached
   npm run dev
   ```

`.env` is gitignored, so the credentials stay out of the repo — set the same variables
in your host's dashboard when you deploy.

### When `db:check` fails

| Message | Cause |
| --- | --- |
| `Authentication failed` / `bad auth` | Wrong user or password, or an unencoded special character |
| `IP ... is not whitelisted` | Add your IP under *Network Access* |
| `querySrv ENOTFOUND` | Cluster hostname typo, or you are offline |
| `Server selection timed out` | Network Access rule missing, or a firewall blocking port 27017 |

## Deploying to Vercel

The same codebase runs locally and on Vercel. Locally `server.js` calls `app.listen()`;
on Vercel `api/index.js` exports a handler that Vercel invokes per request. `vercel.json`
rewrites every path to that handler, so the Express router still owns all routing.

1. **Use MongoDB Atlas.** Vercel cannot reach a database on your laptop, so a local
   `mongodb://127.0.0.1` URI will never work in production. Follow
   [MongoDB Atlas setup](#mongodb-atlas-setup), and make sure **Network Access** allows
   `0.0.0.0/0` — Vercel's functions do not have fixed IPs.
2. **Push the repo to GitHub**, then import it on [vercel.com/new](https://vercel.com/new).
3. **Set environment variables** in Vercel (Settings → Environment Variables):

   | Variable | Value |
   | --- | --- |
   | `MONGO_URI` | Your Atlas connection string |
   | `JWT_SECRET` | A long random string (not the one from `.env`) |
   | `JWT_EXPIRES_IN` | `7d` (optional) |

   Do **not** set `PORT` — Vercel controls that.
4. **Deploy.** Your API is live at `https://<project>.vercel.app/api/health`.

If a deployed page answers `FUNCTION_INVOCATION_FAILED`, the function crashed while
loading — almost always a missing environment variable, since `src/config` throws when
`JWT_SECRET` is not set. `api/index.js` catches that and answers with the actual reason,
so open the URL again after redeploying and read the JSON message.

Notes on the serverless setup:

- `src/config/db.js` caches the Mongoose connection on `global`, so a warm container
  reuses one connection instead of opening a new one per request (which would exhaust
  Atlas' connection limit).
- `vercel.json` sets `MONGOMS_DISABLE_POSTINSTALL=1` so the dev-only
  `mongodb-memory-server` does not download a MongoDB binary during the build.
- Swagger UI's css and js live in `public/swagger/` rather than being served out of
  `node_modules`. Vercel only bundles files it can trace from a `require`, and a path
  resolved at runtime is not traceable — the stylesheet came back 404 in production
  while working locally, because locally the whole `node_modules` tree is on disk.
- `npm run dev:memory` is local-only; serverless functions are stateless and cannot
  host an in-memory database.

## Project layout

```
server.js               bootstrap for local dev: connect to Mongo, then listen
api/index.js            serverless handler used by Vercel
vercel.json             routes every request to the handler
src/
  app.js                express app (exported separately so tests can import it)
  config/
    index.js            env config, fails fast when JWT_SECRET is missing
    db.js               mongoose connection
  models/               User, Post, Comment schemas
  controllers/          request handlers
  routes/               route tables
  middleware/
    auth.js             verifies the Bearer token, loads req.user
    errorHandler.js     maps errors to JSON responses
    notFound.js         JSON 404 for unmatched routes
  utils/token.js        JWT signing
public/                 static files, served by express.static
  docs.html             Swagger UI, served at /docs and /api/documentation
  openapi.json          OpenAPI 3.0 spec for every endpoint
  swagger/              Swagger UI's css and js, copied from swagger-ui-dist
scripts/
  check-db.js           verifies MONGO_URI connects (npm run db:check)
  dev-memory.js         runs the API against an in-memory MongoDB
tests/api.test.js       end-to-end tests
```

## Authentication

`POST /api/auth/register` and `POST /api/auth/login` both return a token:

```json
{ "token": "<jwt>", "user": { "_id": "...", "name": "Alice", "email": "alice@example.com" } }
```

Send it on protected routes:

```
Authorization: Bearer <token>
```

Passwords are hashed with bcrypt in a Mongoose `pre('save')` hook and the field is
`select: false`, so the hash is never returned by the API.

## Endpoints

### Auth

| Method | Path | Auth | Body |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | – | `{ name, email, password }` |
| POST | `/api/auth/login` | – | `{ email, password }` |
| GET | `/api/auth/me` | ✅ | – |

### Posts

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/posts` | – | Paginated; `?page=&limit=&tag=&author=&q=` |
| GET | `/api/posts/:id` | – | |
| POST | `/api/posts` | ✅ | `{ title, content, tags?, published? }` |
| PUT | `/api/posts/:id` | ✅ | Author only |
| DELETE | `/api/posts/:id` | ✅ | Author only; also deletes the post's comments |

List responses are wrapped with pagination metadata:

```json
{ "page": 1, "limit": 10, "total": 42, "pages": 5, "items": [ ... ] }
```

### Comments

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/posts/:postId/comments` | – | Paginated |
| POST | `/api/posts/:postId/comments` | ✅ | `{ body }` |
| GET | `/api/comments/:id` | – | |
| PUT | `/api/comments/:id` | ✅ | Author only |
| DELETE | `/api/comments/:id` | ✅ | Author only |

### Misc

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | Liveness check |

## Error responses

Every error comes back as `{ "message": "..." }` from a single error-handling middleware:

| Status | When |
| --- | --- |
| 400 | Missing fields, schema validation failure, malformed `ObjectId` |
| 401 | Missing, malformed, invalid, or expired token; bad credentials |
| 403 | Authenticated but not the owner of the resource |
| 404 | Unknown route or missing document |
| 409 | Duplicate email |
| 500 | Unhandled server error (logged server-side) |

## Example session

```bash
# register
curl -s -X POST localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","email":"alice@example.com","password":"secret123"}'

TOKEN=<paste token>

# create a post
curl -s -X POST localhost:5000/api/posts \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Express basics","content":"Routing and middleware","tags":["node"]}'

# comment on it
curl -s -X POST localhost:5000/api/posts/<postId>/comments \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"body":"Great write-up"}'

# list posts
curl -s localhost:5000/api/posts
```
