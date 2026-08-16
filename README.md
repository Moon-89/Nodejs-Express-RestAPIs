# Node.js + Express + MongoDB REST API

A REST API built with Express and Mongoose, with JWT authentication and two related
resources (**posts** and **comments**) on top of the **users** collection that backs auth.

## Stack

| Concern | Choice |
| --- | --- |
| Server | Express 4 |
| Database | MongoDB via Mongoose 7 |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` password hashing |
| Tests | `node:test` + `supertest` + `mongodb-memory-server` |

## Getting started

1. Copy the env file and fill it in:

   ```bash
   cp .env.sample .env
   ```

   | Variable | Purpose |
   | --- | --- |
   | `PORT` | Port to listen on (default `5000`) |
   | `MONGO_URI` | MongoDB connection string |
   | `JWT_SECRET` | **Required** — the app refuses to start without it |
   | `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |

2. Install and run:

   ```bash
   npm install
   npm run dev    # nodemon, reloads on change
   npm start      # plain node
   ```

3. Run the tests — they spin up an in-memory MongoDB, so no database setup is needed:

   ```bash
   npm test
   ```

## MongoDB Atlas

The database lives on MongoDB Atlas rather than a local `mongod`.

1. Create a free **M0** cluster at [Atlas](https://www.mongodb.com/cloud/atlas).
2. *Database Access* → add a user with **Read and write to any database**.
3. *Network Access* → add your IP address.
4. Cluster → **Connect** → **Drivers** → **Node.js**, and copy the connection string into
   `.env`. Put the database name before the `?`:

   ```
   MONGO_URI=mongodb+srv://user:password@cluster0.abc12.mongodb.net/devweekends?retryWrites=true&w=majority
   ```

   Without `/devweekends` Mongoose writes to a database called `test`. URL-encode any
   special characters in the password (`@` → `%40`).

`.env` is gitignored, so the credentials never reach the repo.

## Project layout

```
server.js               connects to MongoDB, then starts listening
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
