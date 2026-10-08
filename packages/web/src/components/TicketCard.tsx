import { useDraggable } from "@dnd-kit/core";
import type { Ticket } from "../api/types.js";

export default function TicketCard({ ticket }: { ticket: Ticket }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ticket.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 10 : undefined,
        opacity: isDragging ? 0.6 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="ticket-card"
      {...listeners}
      {...attributes}
      data-testid="ticket-card"
    >
      {ticket.points != null && <span className="points">{ticket.points} pts</span>}
      {ticket.title}
    </div>
  );
}
