# Jarvis Sync API

External systems can pull journal entries and tasks from Jarvis, and push new
tasks back in, via a small HTTP API served by the Convex deployment.

---

## Base URL

```
https://<your-deployment>.convex.site
```

Note the host ends in **`.convex.site`**, not `.convex.cloud`. The `.cloud`
URL is for the Convex client SDK; HTTP routes live on `.site`.

To find your production URL after running `npx convex deploy`:

```bash
npx convex env get NEXT_PUBLIC_CONVEX_SITE_URL --prod
```

---

## Authentication

Every request must include a Bearer token:

```
Authorization: Bearer jv_<64-hex-characters>
```

Keys are generated in the Jarvis app at **Settings → API Keys**. The raw key
is shown exactly once at creation time; only a SHA-256 hash is stored
server-side. If a key is lost, revoke it and create a new one.

A request with a missing, empty, or unrecognised token returns `401`.

---

## Endpoints

### `GET /api/sync`

Pull the current state of your data, scoped to a single user (the owner of
the API key).

#### Query parameters

| Name    | Type     | Required | Description |
|---------|----------|----------|-------------|
| `since` | unix-ms  | no       | Timestamp from the previous sync. Defaults to `0` on first call. |

#### Behaviour

- **Journal entries**: delta — only entries with `_creationTime > since`.
- **Active tasks**: full snapshot of tasks whose status is **not** `done` and
  **not** `someday`. Sent in full on every call so you can replace your local
  active-task set each sync.
- **Newly done tasks**: delta — tasks whose `status == "done"` **and**
  `doneAt > since`. On first pull (`since=0`) this returns every done task;
  subsequent pulls only include tasks that transitioned to done since the
  previous sync.
- Tasks with status `someday` are never returned.

#### Response

`200 application/json`

```json
{
  "syncedAt": 1744729876123,
  "newJournalEntries": [
    {
      "id": "j57abc...",
      "timestamp": 1744729870000,
      "polishedText": "Cleaned-up journal entry text.",
      "rawText": "raw transcribed text",
      "createdAt": 1744729870500
    }
  ],
  "activeTasks": [
    {
      "id": "k3abc...",
      "title": "Call dentist",
      "description": "",
      "notes": null,
      "priority": "normal",
      "size": 3,
      "status": "todo",
      "tags": ["health"],
      "dueDate": null,
      "parentId": null,
      "doneAt": null,
      "createdAt": 1744700000000,
      "updatedAt": 1744700000000
    }
  ],
  "newlyDoneTasks": [
    {
      "id": "k9abc...",
      "title": "Pay rent",
      "description": "",
      "notes": null,
      "priority": "urgent",
      "size": 1,
      "status": "done",
      "tags": ["finance"],
      "dueDate": "2026-04-01",
      "parentId": null,
      "doneAt": 1744500000000,
      "createdAt": 1744000000000,
      "updatedAt": 1744500000000
    }
  ]
}
```

#### Field notes

- All timestamps are **unix milliseconds**.
- `id`, `parentId` are Convex document IDs — treat them as opaque strings.
- `notes`, `doneAt`, `dueDate`, `parentId` may be `null`.
- `priority` ∈ `urgent | high | normal | low`
- `size` ∈ `1 | 2 | 3 | 4 | 5`
- `status` ∈ `todo | in_progress | blocked | someday | done`
  (`someday` will never appear on this endpoint)

#### Sync protocol

On first run, set `since=0`. On every response, persist `syncedAt` locally
and pass it as `since` on the next call. Updates are atomic per request —
a task that transitions to done between two calls will appear in
`newlyDoneTasks` exactly once, provided you always advance `since` with the
value from the response.

#### Example

```bash
curl -s \
  -H "Authorization: Bearer jv_..." \
  "https://<deployment>.convex.site/api/sync?since=1744729000000" \
  | jq .
```

---

### `POST /api/tasks`

Create a new task owned by the API key's user.

#### Headers

```
Authorization: Bearer jv_...
Content-Type: application/json
```

#### Request body

Only `title` is required. Defaults are applied to everything else.

| Field         | Type                               | Default    | Notes |
|---------------|------------------------------------|------------|-------|
| `title`       | string                             | —          | Required, trimmed, non-empty |
| `description` | string                             | `""`       |       |
| `notes`       | string                             | unset      |       |
| `priority`    | `urgent` \| `high` \| `normal` \| `low` | `normal`   |       |
| `status`      | `todo` \| `in_progress` \| `blocked` \| `someday` \| `done` | `todo` | If set to `done`, `doneAt` is stamped to now |
| `size`        | `1` \| `2` \| `3` \| `4` \| `5`    | `3`        |       |
| `tags`        | string[]                           | `[]`       | Trimmed, lower-cased, de-duplicated |
| `dueDate`     | string \| null                     | `null`     | Free-form date string, typically ISO `YYYY-MM-DD` |

Minimal example:

```json
{ "title": "Call dentist" }
```

Full example:

```json
{
  "title": "Draft Q2 report",
  "description": "Cover revenue, churn, and new features.",
  "notes": "Pull numbers from Stripe first.",
  "priority": "urgent",
  "status": "todo",
  "size": 4,
  "tags": ["work", "reporting"],
  "dueDate": "2026-05-01"
}
```

#### Response

`201 Created`

```json
{ "id": "k3abc..." }
```

`400 Bad Request` — invalid JSON or invalid field value:

```json
{ "error": "priority must be one of urgent|high|normal|low" }
```

`401 Unauthorized` — missing/invalid Bearer token.

Notes:

- `parentId` is not exposed via this endpoint; POSTed tasks are always
  root-level.
- Subtasks and merging are managed only inside the Jarvis UI.
- Tasks created via this endpoint immediately appear in the next `/api/sync`
  response as `activeTasks` (or `newlyDoneTasks` if `status` was `done`).

#### Example

```bash
curl -s -X POST \
  -H "Authorization: Bearer jv_..." \
  -H "Content-Type: application/json" \
  -d '{"title":"Call dentist","priority":"urgent","tags":["health"]}' \
  "https://<deployment>.convex.site/api/tasks"
```

---

### `PATCH /api/tasks/:id`

Update an existing task owned by the API key's user. Only fields present
in the request body are changed; omitted fields are left as-is.

#### Headers

```
Authorization: Bearer jv_...
Content-Type: application/json
```

#### Request body

All fields are optional. Same types as `POST /api/tasks` minus `parentId`.

| Field         | Type                                      | Notes |
|---------------|-------------------------------------------|-------|
| `title`       | string                                    | Trimmed, non-empty |
| `description` | string                                    |       |
| `notes`       | string                                    | Pass `""` to clear |
| `priority`    | `urgent` \| `high` \| `normal` \| `low`   |       |
| `status`      | `todo` \| `in_progress` \| `blocked` \| `someday` \| `done` | Transitioning to `done` stamps `doneAt`; transitioning away clears it |
| `size`        | `1` \| `2` \| `3` \| `4` \| `5`           |       |
| `tags`        | string[]                                  | Trimmed, lower-cased, de-duplicated — **replaces** the existing tag list |
| `dueDate`     | string \| null                            |       |

Unknown fields are ignored. `parentId` cannot be changed via this endpoint.

Example — change priority and tags:

```json
{ "priority": "high", "tags": ["work", "urgent"] }
```

#### Response

`200 OK` — body is the updated task in the same shape as entries in the
`/api/sync` response:

```json
{
  "id": "k3abc...",
  "title": "Draft Q2 report",
  "description": "",
  "notes": null,
  "priority": "high",
  "size": 3,
  "status": "todo",
  "tags": ["work", "urgent"],
  "dueDate": null,
  "parentId": null,
  "doneAt": null,
  "createdAt": 1744700000000,
  "updatedAt": 1744800000000
}
```

`400 Bad Request` — invalid JSON, missing/invalid task id, or invalid field value.
`401 Unauthorized` — missing/invalid Bearer token.
`404 Not Found` — the task doesn't exist, or is owned by a different user.

#### Example

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer jv_..." \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}' \
  "https://<deployment>.convex.site/api/tasks/k3abc..."
```

---

## CORS

All endpoints respond to `OPTIONS` preflight with:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

---

## Reference pseudocode

```python
import requests, json, pathlib

STATE = pathlib.Path("jarvis-sync-state.json")
BASE = "https://<deployment>.convex.site"
KEY = "jv_..."

state = json.loads(STATE.read_text()) if STATE.exists() else {"since": 0}

r = requests.get(
    f"{BASE}/api/sync",
    params={"since": state["since"]},
    headers={"Authorization": f"Bearer {KEY}"},
    timeout=30,
)
r.raise_for_status()
data = r.json()

# ...apply data.newJournalEntries, data.activeTasks, data.newlyDoneTasks...

state["since"] = data["syncedAt"]
STATE.write_text(json.dumps(state))
```

---

## Error handling

| Status | Meaning |
|--------|---------|
| `200`  | OK (sync) |
| `201`  | Created (tasks POST) |
| `400`  | Invalid JSON body or invalid field |
| `401`  | Missing / empty / unrecognised Bearer token |

Server-side errors bubble up as `500` with an opaque body; retry with
exponential backoff.

---

## Security notes

- Rotate keys by creating a new one and revoking the old one — you can run
  multiple keys per user simultaneously.
- The hashed key is never exposed by any endpoint; if you lose the raw key,
  you cannot recover it.
- Each key is scoped to exactly one user (the signed-in Jarvis user at the
  time of creation).
