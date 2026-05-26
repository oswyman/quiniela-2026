import Link from "next/link";

export function EmptyState({ title, body, href, action }: { title: string; body: string; href?: string; action?: string }) {
  return (
    <section className="panel stack">
      <h2>{title}</h2>
      <p className="muted">{body}</p>
      {href && action ? <Link className="button secondary" href={href}>{action}</Link> : null}
    </section>
  );
}
