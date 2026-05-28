import { confidenceBand } from "@/lib/utils";

export function ConfidenceBadge({
  confidence,
  sourceCount,
  freshness,
}: {
  confidence: number;
  sourceCount: number;
  freshness: number;
}) {
  const band = confidenceBand(confidence);
  return (
    <span
      className={`confidence confidence-${band}`}
      title={`${sourceCount} sources. Data freshness: ${freshness} minutes.`}
    >
      {band} confidence · {Math.round(confidence)}%
    </span>
  );
}
