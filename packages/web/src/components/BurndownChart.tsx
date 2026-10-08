import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BurndownPoint } from "../api/types.js";

export default function BurndownChart({ series }: { series: BurndownPoint[] }) {
  if (series.length === 0) return null;

  return (
    <div className="chart-panel">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={series}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a303a" />
          <XAxis dataKey="day" stroke="#9aa4b2" fontSize={11} />
          <YAxis stroke="#9aa4b2" fontSize={11} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "#171b21", border: "1px solid #2a303a" }}
            labelStyle={{ color: "#e6e9ef" }}
          />
          <Line
            type="monotone"
            dataKey="idealRemaining"
            name="Ideal"
            stroke="#5b8cff"
            strokeDasharray="4 4"
            dot={false}
          />
          <Line
            type="stepAfter"
            dataKey="actualRemaining"
            name="Actual"
            stroke="#e5584d"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
