import Link from "next/link";

export function GroupNav({ groupId }: { groupId: string }) {
  return (
    <nav className="cluster" aria-label="Navegación de grupo">
      <Link className="button" href={`/groups/${groupId}/predictions`}>Pronosticar</Link>
      <Link className="button secondary" href={`/groups/${groupId}/ranking`}>Ranking</Link>
      <Link className="button secondary" href={`/groups/${groupId}/admin`}>Administrar</Link>
    </nav>
  );
}
