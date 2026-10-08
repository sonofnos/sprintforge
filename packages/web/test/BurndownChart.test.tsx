import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import BurndownChart from "../src/components/BurndownChart.js";

describe("BurndownChart", () => {
  it("renders nothing for an empty series instead of an empty chart frame", () => {
    const { container } = render(<BurndownChart series={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a chart panel when given data", () => {
    const { container } = render(
      <BurndownChart
        series={[
          { day: "2026-01-01", idealRemaining: 10, actualRemaining: 10 },
          { day: "2026-01-02", idealRemaining: 5, actualRemaining: 8 },
        ]}
      />,
    );
    expect(container.querySelector(".chart-panel")).toBeInTheDocument();
  });
});
