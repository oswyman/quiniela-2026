export function StatusMessage({ type = "notice", children, onRetry }: { type?: "notice" | "success" | "error"; children: React.ReactNode; onRetry?: () => void }) {
  return (
    <div className={`${type} statusMessage`}>
      <span>{children}</span>
      {onRetry ? (
        <button className="statusRetry" onClick={onRetry} type="button">Reintentar</button>
      ) : null}
    </div>
  );
}
