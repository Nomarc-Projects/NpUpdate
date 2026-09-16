-- Chat enhancements: muted conversations
ALTER TABLE conversation_participant ADD COLUMN IF NOT EXISTS muted BOOLEAN DEFAULT false;
