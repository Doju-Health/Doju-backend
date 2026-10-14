# Blogs API Documentation

Blog endpoints are available under `/blogs` (use the API version prefix configured by your deployment, if applicable).

## Publishing workflow

Only an admin can create or edit blog posts. A new post is a draft by default and stays out of the public blog endpoints.

To publish a draft, send an authenticated admin request to `PATCH /blogs/{id}` with:

```http
PATCH /blogs/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer <admin-access-token>
Content-Type: application/json
```

```json
{
  "status": "published"
}
```

Publishing sets `publishedAt`. The post then appears in `GET /blogs` and can be retrieved using `GET /blogs/{slug}`.

To unpublish a post, send the same request with `{"status":"draft"}`. It will no longer appear in public blog results. Admins can also publish immediately when creating a post by including `"status": "published"` in the `POST /blogs` body.

## Endpoints

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/blogs` | Admin | Create a blog. Defaults to draft. |
| `GET` | `/blogs?page=1&limit=10` | Public | List published blogs with pagination. |
| `GET` | `/blogs/admin/by-status?status=draft&page=1&limit=10` | Admin | List blogs by status with pagination. `status` is required (`draft` or `published`). |
| `GET` | `/blogs/{slug}` | Public | Get one published blog by slug. |
| `PATCH` | `/blogs/{id}` | Admin | Edit or publish/unpublish a blog by UUID. |
| `DELETE` | `/blogs/{id}` | Admin | Delete a blog by UUID. |

Create and edit request fields:

| Field | Type | Required on create | Description |
| --- | --- | --- | --- |
| `title` | string | Yes | Blog title. |
| `content` | string | Yes | Blog body. |
| `excerpt` | string | No | Short summary. |
| `coverImageUrl` | string | No | Cover image URL. |
| `status` | `draft` \| `published` | No | Defaults to `draft`. |

List pagination defaults to `page=1` and `limit=10`; the maximum limit is 100. The response contains `data` and `meta` with `page`, `limit`, `total`, and `totalPages`.

Admins can list drafts or published posts with `GET /blogs/admin/by-status?status={status}`. For example, `GET /blogs/admin/by-status?status=draft` returns drafts; this endpoint requires an admin bearer token.

The slug is generated automatically from the title. It is not accepted in create or edit request bodies. If an admin changes a title, the slug is regenerated and checked for uniqueness.
