export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ padding: "28px 0 10px" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: "clamp(2rem, 5vw, 3.8rem)" }}>{title}</h1>
      {subtitle ? <p className="muted" style={{ maxWidth: 760 }}>{subtitle}</p> : null}
    </div>
  );
}
