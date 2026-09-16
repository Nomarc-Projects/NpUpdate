/**
 * Create all Project Management and Business Templates tables.
 * Run: doppler run -p nomarc -c dev -- npx tsx scripts/migrate-pm.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../lib/db/client";

async function main() {
  /* ── Project Management ──────────────────────────────────────────── */
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pm_project (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      color TEXT NOT NULL DEFAULT '#ffd716',
      icon TEXT,
      start_date DATE,
      due_date DATE,
      is_template BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pm_project_member (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES pm_project(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pm_invite (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES pm_project(id) ON DELETE CASCADE,
      inviter_user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      accepted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pm_column (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES pm_project(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#9a9a9a',
      sort_order TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pm_task (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES pm_project(id) ON DELETE CASCADE,
      column_id UUID REFERENCES pm_column(id) ON DELETE SET NULL,
      parent_task_id UUID,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'todo',
      sort_order TEXT NOT NULL,
      due_date DATE,
      start_date DATE,
      completed_at TIMESTAMPTZ,
      estimate_hours INTEGER,
      actual_hours INTEGER,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pm_task_assignee (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES pm_task(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pm_tag (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES pm_project(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#ffd716',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pm_task_tag (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES pm_task(id) ON DELETE CASCADE,
      tag_id UUID NOT NULL REFERENCES pm_tag(id) ON DELETE CASCADE
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pm_milestone (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES pm_project(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      due_date DATE,
      completed BOOLEAN NOT NULL DEFAULT false,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pm_comment (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES pm_task(id) ON DELETE CASCADE,
      author_user_id TEXT NOT NULL,
      parent_comment_id UUID,
      body TEXT NOT NULL,
      edited_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pm_attachment (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES pm_task(id) ON DELETE CASCADE,
      uploaded_by TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      size INTEGER,
      mime_type TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pm_activity (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES pm_project(id) ON DELETE CASCADE,
      task_id UUID REFERENCES pm_task(id) ON DELETE CASCADE,
      actor_user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      meta TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  /* ── Indexes ─────────────────────────────────────────────────────── */
  await db.execute(sql`CREATE INDEX IF NOT EXISTS pm_project_owner_idx ON pm_project(owner_user_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS pm_project_member_project_idx ON pm_project_member(project_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS pm_project_member_user_idx ON pm_project_member(user_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS pm_column_project_idx ON pm_column(project_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS pm_task_project_idx ON pm_task(project_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS pm_task_column_idx ON pm_task(column_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS pm_task_assignee_task_idx ON pm_task_assignee(task_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS pm_comment_task_idx ON pm_comment(task_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS pm_activity_project_idx ON pm_activity(project_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS pm_activity_task_idx ON pm_activity(task_id);`);

  /* ── Business Templates ──────────────────────────────────────────── */
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bt_template (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      discipline TEXT,
      file_url TEXT,
      preview_url TEXT,
      file_type TEXT,
      file_size INTEGER,
      downloads INTEGER NOT NULL DEFAULT 0,
      is_premium BOOLEAN NOT NULL DEFAULT false,
      status TEXT NOT NULL DEFAULT 'published',
      submitted_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bt_download (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id UUID NOT NULL REFERENCES bt_template(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bt_submission (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      submitted_by TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      discipline TEXT,
      file_url TEXT,
      file_type TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      review_note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS bt_template_category_idx ON bt_template(category);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS bt_template_discipline_idx ON bt_template(discipline);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS bt_download_template_idx ON bt_download(template_id);`);

  console.log("✓ pm_* and bt_* tables ready");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
