import Link from "next/link";

export function GroupNav({ groupId }: { groupId: string }) {
  return (
    <nav className="tabs" aria-label="Navegación de grupo">
      <Link href={`/groups/${groupId}`}>Resumen</Link>
      <Link href={`/groups/${groupId}/predictions`}>Pronósticos</Link>
      <Link href={`/groups/${groupId}/ranking`}>Ranking</Link>
      <Link href={`/groups/${groupId}/admin`}>Admin</Link>
    </nav>
  );
}
