"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { timeOf, type Reading } from "@/lib/tank-stats";

type Props = { readings: Reading[]; breaches: Reading[]; threshold: number };

export function LevelChart({ readings, breaches, threshold }: Props) {
  const data = readings.map((r) => ({ time: timeOf(r.timestamp), level: r.level_percent }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
          <YAxis domain={[0, 100]} unit="%" stroke="#64748b" fontSize={12} />
          <Tooltip
            formatter={(value) => `${value}%`}
            labelFormatter={(label) => `Time ${label}`}
          />
          <ReferenceLine
            y={threshold}
            stroke="#dc2626"
            strokeDasharray="6 4"
            label={{
              value: `${threshold}% threshold`,
              position: "insideTopRight",
              fill: "#dc2626",
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="level"
            name="Level"
            stroke="#0284c7"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          {breaches.map((b) => (
            <ReferenceDot
              key={b.timestamp}
              x={timeOf(b.timestamp)}
              y={b.level_percent}
              r={6}
              fill="#dc2626"
              stroke="#fff"
              strokeWidth={2}
              ifOverflow="visible"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}