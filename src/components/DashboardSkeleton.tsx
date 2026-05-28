export function DashboardSkeleton() {
  return (
    <div className="grid" aria-busy="true" aria-label="Cargando grupos">
      {[0, 1].map((i) => (
        <article className="panel stack" key={i} aria-hidden="true">
          <div className="cluster">
            <div className="skeleton skeletonPill" />
            <div className="skeleton skeletonPill" />
          </div>
          <div className="skeleton skeletonTitle" style={{ marginTop: 4 }} />
          <div className="skeleton skeletonLine" />
          <div className="skeleton skeletonLineShort" />
          <div className="cluster" style={{ marginTop: 8 }}>
            <div className="skeleton skeletonButton" />
            <div className="skeleton skeletonButton" />
          </div>
        </article>
      ))}
    </div>
  );
}
