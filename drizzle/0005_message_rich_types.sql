-- Rich message types: structured attachments (polls, events, contacts, media)
ALTER TABLE message ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE message ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE message ALTER COLUMN body SET DEFAULT '';
ALTER TABLE message ALTER COLUMN body SET NOT NULL;
