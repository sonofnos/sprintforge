import type { ColumnType, Generated } from "kysely";

export type ProjectRole = "admin" | "member";
export type SprintStatus = "planned" | "active" | "completed";

export interface UsersTable {
  id: Generated<string>;
  email: string;
  password_hash: string;
  name: string;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface ProjectsTable {
  id: Generated<string>;
  key: string;
  name: string;
  created_by: string;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface ProjectMembersTable {
  project_id: string;
  user_id: string;
  role: ProjectRole;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface SprintsTable {
  id: Generated<string>;
  project_id: string;
  name: string;
  goal: string | null;
  starts_on: ColumnType<Date, string, string>;
  ends_on: ColumnType<Date, string, string>;
  status: Generated<SprintStatus>;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface BoardColumnsTable {
  id: Generated<string>;
  project_id: string;
  name: string;
  position: number;
  is_done_column: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface TicketsTable {
  id: Generated<string>;
  project_id: string;
  sprint_id: string | null;
  column_id: string;
  title: string;
  description: string;
  points: number | null;
  assignee_id: string | null;
  position: number;
  version: Generated<number>;
  completed_at: ColumnType<Date | null, string | null | undefined, string | null>;
  created_by: string;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export interface CommentsTable {
  id: Generated<string>;
  ticket_id: string;
  author_id: string;
  body: string;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface Database {
  users: UsersTable;
  projects: ProjectsTable;
  project_members: ProjectMembersTable;
  sprints: SprintsTable;
  board_columns: BoardColumnsTable;
  tickets: TicketsTable;
  comments: CommentsTable;
}
