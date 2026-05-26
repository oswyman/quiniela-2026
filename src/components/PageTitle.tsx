export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ padding: "32px 0 12px" }}>
      <p className="eyebrow">Quiniela Mundial 2026</p>
      <h1 style={{ margin: "0 0 8px", fontSize: "clamp(2.2rem, 6vw, 4.5rem)", lineHeight: 1 }}>{title}</h1>
      {subtitle ? <p className="muted" style={{ maxWidth: 780, fontSize: "1.05rem", lineHeight: 1.55 }}>{subtitle}</p> : null}
    </div>
  );
}
