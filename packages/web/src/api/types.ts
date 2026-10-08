export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Project {
  id: string;
  key: string;
  name: string;
  role?: "admin" | "member";
}

export interface BoardColumn {
  id: string;
  project_id: string;
  name: string;
  position: number;
  is_done_column: boolean;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  starts_on: string;
  ends_on: string;
  status: "planned" | "active" | "completed";
}

export interface Ticket {
  id: string;
  project_id: string;
  sprint_id: string | null;
  column_id: string;
  title: string;
  description: string;
  points: number | null;
  assignee_id: string | null;
  position: number;
  version: number;
  completed_at: string | null;
}

export interface Comment {
  id: string;
  body: string;
  created_at: string;
  authorId: string;
  authorName: string;
}

export interface BurndownPoint {
  day: string;
  idealRemaining: number;
  actualRemaining: number;
}
