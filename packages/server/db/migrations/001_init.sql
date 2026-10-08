create extension if not exists "pgcrypto";

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create type project_role as enum ('admin', 'member');

create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role project_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create type sprint_status as enum ('planned', 'active', 'completed');

create table sprints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  goal text,
  starts_on date not null,
  ends_on date not null,
  status sprint_status not null default 'planned',
  created_at timestamptz not null default now(),
  constraint sprint_dates_valid check (ends_on >= starts_on)
);

create table board_columns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  position integer not null,
  is_done_column boolean not null default false,
  created_at timestamptz not null default now(),
  unique (project_id, position)
);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  sprint_id uuid references sprints(id) on delete set null,
  column_id uuid not null references board_columns(id),
  title text not null,
  description text not null default '',
  points integer,
  assignee_id uuid references users(id),
  position double precision not null,
  version integer not null default 1,
  completed_at timestamptz,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tickets_project_sprint_idx on tickets (project_id, sprint_id);
create index tickets_column_position_idx on tickets (column_id, position);

create table comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  author_id uuid not null references users(id),
  body text not null,
  created_at timestamptz not null default now()
);

create index comments_ticket_idx on comments (ticket_id, created_at);
