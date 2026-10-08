import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, getAuthToken } from "../api/client.js";
import type { Ticket, Comment } from "../api/types.js";

interface ProjectSocketHandlers {
  onTicketCreated?: (ticket: Ticket) => void;
  onTicketUpdated?: (ticket: Ticket) => void;
  onTicketMoved?: (ticket: Ticket) => void;
  onTicketDeleted?: (payload: { id: string }) => void;
  onCommentCreated?: (payload: { ticketId: string; comment: Comment }) => void;
}

// Keeps the board in sync across tabs/users: when someone else moves or edits
// a ticket, the event arrives here instead of requiring a poll or a refresh.
export function useProjectSocket(projectId: string | undefined, handlers: ProjectSocketHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!projectId) return;
    const token = getAuthToken();
    if (!token) return;

    const socket: Socket = io(API_BASE_URL, { auth: { token } });

    socket.on("connect", () => socket.emit("project:join", projectId));
    socket.on("ticket:created", (t: Ticket) => handlersRef.current.onTicketCreated?.(t));
    socket.on("ticket:updated", (t: Ticket) => handlersRef.current.onTicketUpdated?.(t));
    socket.on("ticket:moved", (t: Ticket) => handlersRef.current.onTicketMoved?.(t));
    socket.on("ticket:deleted", (p: { id: string }) => handlersRef.current.onTicketDeleted?.(p));
    socket.on("comment:created", (p: { ticketId: string; comment: Comment }) =>
      handlersRef.current.onCommentCreated?.(p),
    );

    return () => {
      socket.emit("project:leave", projectId);
      socket.disconnect();
    };
  }, [projectId]);
}
