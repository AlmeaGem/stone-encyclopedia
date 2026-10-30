-- New, independent D1 only. Never run against Supabase or Manager.
CREATE TABLE IF NOT EXISTS photos (
 stone_id TEXT PRIMARY KEY,
 revision TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('published','paused','deleted')),
 object_key TEXT NOT NULL,
 metadata TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS photo_history (
 revision TEXT PRIMARY KEY,
 stone_id TEXT NOT NULL,
 action TEXT NOT NULL,
 actor TEXT NOT NULL,
 metadata TEXT NOT NULL,
 created_at TEXT NOT NULL
);
