import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DndContext } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { api, ApiError } from "../api/client.js";
import { useProjectSocket } from "../hooks/useProjectSocket.js";
import Column from "../components/Column.js";
import BurndownChart from "../components/BurndownChart.js";
import type { BoardColumn, BurndownPoint, Project, Sprint, Ticket } from "../api/types.js";

export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string | undefined>(undefined);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [burndown, setBurndown] = useState<BurndownPoint[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    const detail = await api.get<{ project: Project; columns: BoardColumn[] }>(
      `/api/projects/${projectId}`,
    );
    setProject(detail.project);
    setColumns(detail.columns);
  }, [projectId]);

  const loadSprints = useCallback(async () => {
    if (!projectId) return;
    const res = await api.get<{ sprints: Sprint[] }>(`/api/projects/${projectId}/sprints`);
    setSprints(res.sprints);
    const active = res.sprints.find((s) => s.status === "active");
    setSelectedSprintId(active?.id);
  }, [projectId]);

  const loadTickets = useCallback(async () => {
    if (!projectId) return;
    const qs = selectedSprintId ? `?sprintId=${selectedSprintId}` : "";
    const res = await api.get<{ tickets: Ticket[] }>(`/api/projects/${projectId}/tickets${qs}`);
    setTickets(res.tickets);
  }, [projectId, selectedSprintId]);

  useEffect(() => {
    loadProject();
    loadSprints();
  }, [loadProject, loadSprints]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!projectId || !selectedSprintId) {
      setBurndown([]);
      return;
    }
    api
      .get<{ series: BurndownPoint[] }>(
        `/api/projects/${projectId}/sprints/${selectedSprintId}/burndown`,
      )
      .then((res) => setBurndown(res.series));
  }, [projectId, selectedSprintId]);

  const upsertTicket = useCallback((ticket: Ticket) => {
    setTickets((prev) => {
      const exists = prev.some((t) => t.id === ticket.id);
      return exists ? prev.map((t) => (t.id === ticket.id ? ticket : t)) : [...prev, ticket];
    });
  }, []);

  useProjectSocket(projectId, {
    onTicketCreated: upsertTicket,
    onTicketUpdated: upsertTicket,
    onTicketMoved: upsertTicket,
    onTicketDeleted: ({ id }) => setTickets((prev) => prev.filter((t) => t.id !== id)),
  });

  const ticketsByColumn = useMemo(() => {
    const map = new Map<string, Ticket[]>();
    for (const ticket of tickets) {
      const list = map.get(ticket.column_id) ?? [];
      list.push(ticket);
      map.set(ticket.column_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.position - b.position);
    return map;
  }, [tickets]);

  async function onCreateTicket(columnId: string, title: string) {
    if (!projectId) return;
    const res = await api.post<{ ticket: Ticket }>(`/api/projects/${projectId}/tickets`, {
      columnId,
      sprintId: selectedSprintId,
      title,
    });
    upsertTicket(res.ticket);
  }

  async function onDragEnd(event: DragEndEvent) {
    if (!projectId) return;
    const ticketId = event.active.id as string;
    const targetColumnId = event.over?.id as string | undefined;
    if (!targetColumnId) return;

    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || ticket.column_id === targetColumnId) return;

    const siblings = ticketsByColumn.get(targetColumnId) ?? [];
    const position = siblings.length > 0 ? Math.max(...siblings.map((t) => t.position)) + 1 : 1;

    try {
      const res = await api.post<{ ticket: Ticket }>(
        `/api/projects/${projectId}/tickets/${ticketId}/move`,
        { columnId: targetColumnId, position, version: ticket.version },
      );
      upsertTicket(res.ticket);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setNotice("Someone else moved that card first — refreshed to their version.");
        loadTickets();
      } else {
        setNotice(err instanceof ApiError ? err.message : "could not move ticket");
      }
    }
  }

  if (!project) return <div className="centered">Loading…</div>;

  return (
    <div>
      <div className="topbar">
        <div>
          <Link to="/" style={{ marginRight: 12 }}>
            ← Projects
          </Link>
          <strong>
            {project.key} · {project.name}
          </strong>
        </div>
      </div>
      <div className="page">
        <div className="sprint-bar">
          <label htmlFor="sprint-select" style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            Sprint
          </label>
          <select
            id="sprint-select"
            value={selectedSprintId ?? ""}
            onChange={(e) => setSelectedSprintId(e.target.value || undefined)}
          >
            <option value="">Backlog (no sprint)</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status})
              </option>
            ))}
          </select>
        </div>

        {notice && <div className="error-banner">{notice}</div>}

        {selectedSprintId && <BurndownChart series={burndown} />}

        <DndContext onDragEnd={onDragEnd}>
          <div className="board">
            {columns.map((column) => (
              <Column
                key={column.id}
                column={column}
                tickets={ticketsByColumn.get(column.id) ?? []}
                onCreateTicket={onCreateTicket}
              />
            ))}
          </div>
        </DndContext>
      </div>
    </div>
  );
}
