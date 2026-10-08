import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client.js";
import { useAuth } from "../hooks/useAuth.js";
import type { Project } from "../api/types.js";

export default function ProjectsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ projects: Project[] }>("/api/projects").then((res) => setProjects(res.projects));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post<{ project: Project }>("/api/projects", {
        key: key.toUpperCase(),
        name,
      });
      navigate(`/projects/${res.project.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "could not create project");
    }
  }

  return (
    <div>
      <div className="topbar">
        <h1>SprintForge</h1>
        <div>
          <span style={{ marginRight: 12, color: "var(--muted)" }}>{user?.name}</span>
          <button className="secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
      <div className="page">
        <h2>Your projects</h2>
        {error && <div className="error-banner">{error}</div>}
        <div className="project-list">
          {projects.map((p) => (
            <Link key={p.id} className="project-card" to={`/projects/${p.id}`}>
              <div className="key">{p.key}</div>
              <div>{p.name}</div>
            </Link>
          ))}
        </div>
        <form className="new-project-form" onSubmit={onCreate}>
          <input
            placeholder="KEY"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            maxLength={10}
            style={{ width: 80 }}
            required
          />
          <input
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button type="submit">Create project</button>
        </form>
      </div>
    </div>
  );
}
