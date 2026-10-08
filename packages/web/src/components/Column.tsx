import { useState } from "react";
import type { FormEvent } from "react";
import { useDroppable } from "@dnd-kit/core";
import TicketCard from "./TicketCard.js";
import type { BoardColumn, Ticket } from "../api/types.js";

export default function Column({
  column,
  tickets,
  onCreateTicket,
}: {
  column: BoardColumn;
  tickets: Ticket[];
  onCreateTicket: (columnId: string, title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onCreateTicket(column.id, title.trim());
    setTitle("");
    setAdding(false);
  }

  return (
    <div
      ref={setNodeRef}
      className="column"
      style={{ background: isOver ? "#1b2027" : undefined }}
    >
      <div className="column-header">
        <span>{column.name}</span>
        <span>{tickets.length}</span>
      </div>
      {tickets.map((t) => (
        <TicketCard key={t.id} ticket={t} />
      ))}
      {adding ? (
        <form onSubmit={submit}>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => !title && setAdding(false)}
            placeholder="Ticket title"
            style={{ width: "100%", marginBottom: 6 }}
          />
        </form>
      ) : (
        <button className="add-ticket" onClick={() => setAdding(true)}>
          + Add ticket
        </button>
      )}
    </div>
  );
}
