export function MetricCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <article className="card metric stat">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
      {detail ? <p className="muted">{detail}</p> : null}
    </article>
  );
}
