"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { PageTitle } from "@/components/PageTitle";
import { RulesPanel } from "@/components/RulesPanel";
import { getGroup, listMatches, listMembers, listPrizes, listScores } from "@/lib/firebase/firestore";
import type { Group, Match, Member, Score } from "@/types";

export default function GroupPage() {
  return (
    <AuthGate>
      <GroupContent />
    </AuthGate>
  );
}

function GroupContent() {
  const params = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [prizes, setPrizes] = useState<Array<{ uid: string; estimatedPrize: number; ruleApplied: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [nextGroup, nextMembers, nextMatches, nextScores, nextPrizes] = await Promise.all([
          getGroup(params.groupId),
          listMembers(params.groupId),
          listMatches(),
          listScores(params.groupId),
          listPrizes(params.groupId)
        ]);
        setGroup(nextGroup);
        setMembers(nextMembers);
        setMatches(nextMatches);
        setScores(nextScores);
        setPrizes(nextPrizes as Array<{ uid: string; estimatedPrize: number; ruleApplied: string }>);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el grupo.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.groupId]);

  if (loading) return <main className="container"><p>Cargando grupo...</p></main>;
  if (error) return <main className="container"><div className="error">{error}</div></main>;
  if (!group) return <main className="container"><div className="card">Grupo no encontrado.</div></main>;

  return (
    <main className="container stack">
      <PageTitle title={group.name} subtitle={`${group.currency} ${group.contributionAmount.toLocaleString("es-MX")} por participante · Responsable: ${group.moneyResponsibleName}`} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link className="button" href={`/groups/${group.id}/predictions`}>Pronosticar</Link>
        <Link className="button secondary" href={`/groups/${group.id}/ranking`}>Ranking</Link>
        <Link className="button secondary" href={`/groups/${group.id}/admin`}>Administrar</Link>
      </div>
      <RulesPanel group={group} />
      <div className="grid">
        <section className="card">
          <h2>Participantes</h2>
          {members.length === 0 ? <p className="muted">Sin participantes.</p> : members.map((member) => <p key={member.uid}>{member.displayName} · {member.paymentStatus}</p>)}
        </section>
        <section className="card">
          <h2>Próximos partidos</h2>
          {matches.length === 0 ? <p className="muted">Aún no hay fixtures cargados.</p> : matches.slice(0, 5).map((match) => <p key={match.id}>{match.homeTeam} vs {match.awayTeam}</p>)}
        </section>
        <section className="card">
          <h2>Ranking</h2>
          {scores.length === 0 ? <p className="muted">Sin puntuación calculada.</p> : scores.slice(0, 5).map((score, index) => <p key={score.uid}>{index + 1}. {score.displayName ?? score.uid}: {score.totalPoints} pts</p>)}
        </section>
        <section className="card">
          <h2>Premios estimados</h2>
          {prizes.length === 0 ? <p className="muted">Recalcula ranking cuando haya resultados.</p> : prizes.map((prize) => <p key={prize.uid}>{prize.uid}: {group.currency} {prize.estimatedPrize}</p>)}
        </section>
      </div>
    </main>
  );
}
