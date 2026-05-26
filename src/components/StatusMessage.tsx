export function StatusMessage({ type = "notice", children }: { type?: "notice" | "success" | "error"; children: React.ReactNode }) {
  return <div className={type}>{children}</div>;
}
