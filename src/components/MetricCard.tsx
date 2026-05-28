export function MetricCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <article className="card metricItem">
      <strong className="metricValue">{value}</strong>
      <div className="metricMeta">
        <span className="metricLabel">{label}</span>
        {detail ? <span className="metricDetail">{detail}</span> : null}
      </div>
    </article>
  );
}
