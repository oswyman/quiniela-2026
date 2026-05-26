export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pageTitle">
      <p className="eyebrow">La Cancha · Mundial 2026</p>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}
