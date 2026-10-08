import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import Column from "../src/components/Column.js";
import type { BoardColumn, Ticket } from "../src/api/types.js";

const column: BoardColumn = {
  id: "col-1",
  project_id: "proj-1",
  name: "Backlog",
  position: 0,
  is_done_column: false,
};

const ticket: Ticket = {
  id: "ticket-1",
  project_id: "proj-1",
  sprint_id: null,
  column_id: "col-1",
  title: "Write tests",
  description: "",
  points: 3,
  assignee_id: null,
  position: 1,
  version: 1,
  completed_at: null,
};

function renderColumn(tickets: Ticket[], onCreateTicket = vi.fn()) {
  return render(
    <DndContext onDragEnd={() => {}}>
      <Column column={column} tickets={tickets} onCreateTicket={onCreateTicket} />
    </DndContext>,
  );
}

describe("Column", () => {
  it("shows its tickets and their point counts", () => {
    renderColumn([ticket]);
    expect(screen.getByText("Write tests")).toBeInTheDocument();
    expect(screen.getByText("3 pts")).toBeInTheDocument();
  });

  it("submits a new ticket title and resets the input", () => {
    const onCreateTicket = vi.fn();
    renderColumn([], onCreateTicket);

    fireEvent.click(screen.getByText("+ Add ticket"));
    const input = screen.getByPlaceholderText("Ticket title");
    fireEvent.change(input, { target: { value: "New card" } });
    fireEvent.submit(input.closest("form")!);

    expect(onCreateTicket).toHaveBeenCalledWith("col-1", "New card");
  });

  it("ignores a submit with a blank title", () => {
    const onCreateTicket = vi.fn();
    renderColumn([], onCreateTicket);

    fireEvent.click(screen.getByText("+ Add ticket"));
    fireEvent.submit(screen.getByPlaceholderText("Ticket title").closest("form")!);

    expect(onCreateTicket).not.toHaveBeenCalled();
  });
});
