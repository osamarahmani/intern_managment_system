require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const pool = require('../db/pool')

const runMigration = async () => {
  try {
    console.log('Running database migrations...')

    // Create extensions
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')

    // Create auth schema and auth.users dummy table
    await pool.query('CREATE SCHEMA IF NOT EXISTS auth;')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text UNIQUE,
        created_at timestamptz DEFAULT now()
      );
    `)

    // 1. batches table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.batches (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_number text UNIQUE NOT NULL,
        registration_key text NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        visibility_mode text NOT NULL DEFAULT 'intern_choice' CHECK (visibility_mode IN ('public', 'private', 'intern_choice')),
        created_by uuid,
        is_archived boolean DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    // 2. interns table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.interns (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        college_name text,
        dept text,
        year text,
        sem text,
        mail text UNIQUE NOT NULL,
        number text,
        starting_date date,
        ending_date date,
        batch_number text REFERENCES public.batches(batch_number) ON DELETE SET NULL,
        status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        profile_visible boolean NOT NULL DEFAULT true,
        photo bytea,
        photo_mime_type text,
        is_archived boolean DEFAULT false,
        archived_at timestamptz,
        intern_status text,
        discontinued_reason text,
        login_blocked boolean DEFAULT false,
        feedback_given_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    // 3. profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.profiles (
        id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'intern')),
        intern_id uuid REFERENCES public.interns(id) ON DELETE SET NULL,
        name text,
        email text,
        password text,
        must_change_password boolean DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    // 4. users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text UNIQUE NOT NULL,
        password_hash text NOT NULL,
        role text NOT NULL CHECK (role IN ('admin', 'intern')),
        intern_id uuid REFERENCES public.interns(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    // 5. projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.projects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        intern_id uuid UNIQUE NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
        title text NOT NULL,
        description text,
        git_repo_link text,
        live_project_link text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    // 6. tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        intern_id uuid NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
        title text NOT NULL,
        expected_date date,
        submission_date date,
        status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
        upcoming_task boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `)

    // Create subtasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subtasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        title text NOT NULL,
        description text DEFAULT '',
        expected_date date,
        status text DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
        created_at timestamptz DEFAULT now()
      )
    `)

    // Create task_notes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.task_notes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
        intern_id uuid NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
        note text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    // Reconcile older task_notes tables with the current note model.
    await pool.query(`
      ALTER TABLE public.task_notes
        ADD COLUMN IF NOT EXISTS intern_id uuid REFERENCES public.interns(id) ON DELETE CASCADE;
      UPDATE public.task_notes n
      SET intern_id = t.intern_id
      FROM public.tasks t
      WHERE n.task_id = t.id AND n.intern_id IS NULL;
      ALTER TABLE public.task_notes ALTER COLUMN intern_id SET NOT NULL;
      ALTER TABLE public.task_notes
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
    `)

    // intern_feedback table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.intern_feedback (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        intern_id uuid NOT NULL UNIQUE REFERENCES public.interns(id) ON DELETE CASCADE,
        given_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
        rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
        feedback text NOT NULL,
        given_at timestamptz DEFAULT now()
      )
    `)

    // 7. password_reset_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL,
        token text NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        used boolean DEFAULT false,
        created_at timestamptz DEFAULT now()
      );
    `)

    // CREATE TABLE IF NOT EXISTS ai_task_drafts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.ai_task_drafts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        intern_id uuid NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
        title text NOT NULL,
        description text DEFAULT '',
        deliverables text[] DEFAULT '{}',
        expected_date date,
        is_assigned boolean DEFAULT false,
        assigned_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
        created_at timestamptz DEFAULT now()
      );
    `)

    // Idempotent column additions for existing tables
    const colAdditions = [
      "ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;",
      "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name text;",
      "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text UNIQUE;",
      "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password text;",
      "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT true;",
      "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;",
      "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;",
      "ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;",
      "ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS archived_at timestamptz;",
      "ALTER TABLE public.interns ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;",
      "ALTER TABLE public.interns ADD COLUMN IF NOT EXISTS archived_at timestamptz;",
      "ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description text DEFAULT '';",
      "ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deliverables text[] DEFAULT '{}';",
      "ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_ai_generated boolean DEFAULT false;",
      "ALTER TABLE public.interns ADD COLUMN IF NOT EXISTS intern_status text DEFAULT 'active' CHECK (intern_status IN ('active','completed','discontinued'));",
      "ALTER TABLE public.interns ADD COLUMN IF NOT EXISTS discontinued_reason text;",
      "ALTER TABLE public.interns ADD COLUMN IF NOT EXISTS feedback_given_at timestamptz;",
      "ALTER TABLE public.interns ADD COLUMN IF NOT EXISTS login_blocked boolean DEFAULT false;"
    ]

    for (const addCol of colAdditions) {
      await pool.query(addCol)
    }

    // Role check constraint update for profiles (idempotent drops and adds)
    await pool.query(`
      ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin', 'admin', 'intern'));
    `)

    // Indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_interns_batch_number ON public.interns(batch_number);')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_interns_status ON public.interns(status);')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_profiles_intern_id ON public.profiles(intern_id);')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_intern_id ON public.users(intern_id);')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_intern_id ON public.tasks(intern_id);')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON public.subtasks(task_id);')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_task_notes_task_id ON public.task_notes(task_id);')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_batches_created_by ON public.batches(created_by);')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_password_reset_email ON public.password_reset_tokens(email);')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_projects_intern_id ON public.projects(intern_id);')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_intern_id ON public.tasks(intern_id);')

    console.log('Migrations completed successfully!')
    process.exit(0)
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  }
}

runMigration()
