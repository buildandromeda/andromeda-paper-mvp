import type { ProbabilitySnapshot } from "@/lib/types";

export function ProbabilityChart({ history }: { history: ProbabilitySnapshot[] }) {
  const points = history.map((item, index) => {
    const x = (index / Math.max(1, history.length - 1)) * 100;
    const y = 100 - item.probability;
    return `${x},${y}`;
  });

  return (
    <div className="chart-card" aria-label="Probability history chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="probArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(26, 199, 139, 0.42)" />
            <stop offset="100%" stopColor="rgba(26, 199, 139, 0)" />
          </linearGradient>
        </defs>
        <polyline points={`0,100 ${points.join(" ")} 100,100`} fill="url(#probArea)" stroke="none" />
        <polyline points={points.join(" ")} fill="none" stroke="#1ac78b" strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
