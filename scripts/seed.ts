/**
 * seed.ts — Seed del Firebase Local Emulator para La Cancha.
 *
 * Uso:
 *   # Terminal 1: firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data
 *   # Terminal 2: npm run emulator:seed
 *
 * Crea: 9 usuarios, 1 grupo, 8 members, 15 partidos, ~104 predicciones,
 *       scores calculados y premios distribuidos.
 */

// Las env vars de emulador DEBEN estar antes de cualquier import de firebase-admin
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";

import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";

import {
  GROUP_ID, PASSWORD, USERS, PARTICIPANTS, MATCHES,
  PICKS_BY_UID, type SeedUser, type SeedMatch, type UserPick,
} from "./seed-data";
import { calculatePredictionScore, inferPickType } from "@/lib/scoring";
import { calculatePrizeAllocations, rankScores } from "@/lib/prizes";
import type { Match, Prediction, Score } from "@/types";

// ── Inicializar Admin SDK ─────────────────────────────────────────────────────

if (!getApps().length) {
  initializeApp({ projectId: "quiniela-2026-9883d" });
}

const adminAuth = getAuth();
const db = getFirestore();

// ── Helpers ───────────────────────────────────────────────────────────────────

function nowPlusMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

function toTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

function log(msg: string) {
  process.stdout.write(msg + "\n");
}

// ── Paso 1: systemConfig ──────────────────────────────────────────────────────

async function seedSystemConfig() {
  await db.collection("systemConfig").doc("tournament").set({
    firstKickoffAt: toTimestamp(nowPlusMinutes(-200)),
    registrationCutoffMinutes: 90,
    resultsMode: "manual",
  });

  await db.collection("systemConfig").doc("providerStatus").set({
    provider: "manual",
    status: "idle",
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// ── Paso 2: Usuarios ──────────────────────────────────────────────────────────

async function seedUsers(): Promise<Map<string, string>> {
  // Retorna Map<email, uid>
  const uidMap = new Map<string, string>();

  for (const user of USERS) {
    // Crear en Auth emulator
    try {
      await adminAuth.deleteUser(user.uid);
    } catch {
      // No existía, ok
    }

    await adminAuth.createUser({
      uid: user.uid,
      email: user.email,
      password: PASSWORD,
      displayName: user.displayName,
      emailVerified: true,
    });

    // Documento en /users
    await db.collection("users").doc(user.uid).set({
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      roleGlobal: user.roleGlobal,
      createdAt: FieldValue.serverTimestamp(),
    });

    uidMap.set(user.email, user.uid);
  }

  return uidMap;
}

// ── Paso 3: Grupo ─────────────────────────────────────────────────────────────

async function seedGroup() {
  await db.collection("groups").doc(GROUP_ID).set({
    id: GROUP_ID,
    name: "Liga del Taco 2026",
    slug: GROUP_ID,
    status: "active",
    currency: "MXN",
    contributionAmount: 200,
    moneyResponsibleName: "Alice Ramírez",
    moneyResponsibleEmail: "alice@test.com",
    validResultMode: "NINETY",
    predictionVisibility: "AFTER_CLOSE",
    createdBy: "uid-alice",
    createdAt: FieldValue.serverTimestamp(),
    minParticipants: 3,
    prizeRuleMode: "DEFAULT",
    legalDisclaimerAccepted: true,
  });
}

// ── Paso 4: Members ───────────────────────────────────────────────────────────

async function seedMembers() {
  const batch = db.batch();

  for (const user of PARTICIPANTS) {
    const role = user.isGroupAdmin ? "group_admin" : "participant";

    const memberData = {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      role,
      paymentStatus: user.paymentStatus,
      status: "active",
      joinedAt: FieldValue.serverTimestamp(),
    };

    // Subcol groups/{groupId}/members/{uid}
    batch.set(
      db.collection("groups").doc(GROUP_ID).collection("members").doc(user.uid),
      memberData,
    );

    // Colección denormalizada groupMembers/{groupId}_{uid}
    batch.set(
      db.collection("groupMembers").doc(`${GROUP_ID}_${user.uid}`),
      { ...memberData, groupId: GROUP_ID },
    );
  }

  await batch.commit();
}

// ── Paso 5: Partidos ──────────────────────────────────────────────────────────

async function seedMatches(): Promise<Map<string, Match>> {
  const matchMap = new Map<string, Match>();
  const batch = db.batch();

  for (const m of MATCHES) {
    const kickoffAt = toTimestamp(nowPlusMinutes(m.kickoffOffsetMinutes));
    const isFinished = m.status === "finished";

    const doc: Record<string, unknown> = {
      id: m.id,
      matchNumber: m.matchNumber,
      phase: m.phase,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      kickoffAt,
      timezone: "America/Mexico_City",
      status: m.status,
      isPublishedToParticipants: true,
      provider: "manual",
    };

    if (m.fifaGroup) doc.fifaGroup = m.fifaGroup;

    if (isFinished) {
      doc.homeGoals90 = m.homeGoals90 ?? 0;
      doc.awayGoals90 = m.awayGoals90 ?? 0;
      doc.resultLockedAt = FieldValue.serverTimestamp();
      doc.resultSource = "manual";
      if (m.winnerTeam) doc.winnerTeam = m.winnerTeam;
    }

    batch.set(db.collection("matches").doc(m.id), doc);

    // Construir objeto Match tipado para el scoring
    const matchForScoring: Match = {
      id: m.id,
      matchNumber: m.matchNumber,
      phase: m.phase,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      kickoffAt,
      timezone: "America/Mexico_City",
      status: m.status,
      fifaGroup: m.fifaGroup,
      homeGoals90: m.homeGoals90 ?? null,
      awayGoals90: m.awayGoals90 ?? null,
      winnerTeam: m.winnerTeam ?? null,
    } as unknown as Match;

    matchMap.set(m.id, matchForScoring);
  }

  await batch.commit();
  return matchMap;
}

// ── Paso 6 & 7: Predicciones + Scores ─────────────────────────────────────────

type ScoreAccum = {
  uid: string;
  displayName: string;
  totalPoints: number;
  totalCorrect: number;
  correctGroupPicks: number;
  correctAdvancingPicks: number;
  exactScores: number;
  correctWinners: number;
  correctDraws: number;
  correctGoalDifferences: number;
  validPredictions: number;
  latePredictions: number;
};

async function seedPredictionsAndScores(matchMap: Map<string, Match>) {
  const scoresByUid = new Map<string, ScoreAccum>();

  // Inicializar acumuladores
  for (const user of PARTICIPANTS) {
    scoresByUid.set(user.uid, {
      uid: user.uid,
      displayName: user.displayName,
      totalPoints: 0,
      totalCorrect: 0,
      correctGroupPicks: 0,
      correctAdvancingPicks: 0,
      exactScores: 0,
      correctWinners: 0,
      correctDraws: 0,
      correctGoalDifferences: 0,
      validPredictions: 0,
      latePredictions: 0,
    });
  }

  // Escribir predicciones en lotes
  let batch = db.batch();
  let batchCount = 0;

  for (const user of PARTICIPANTS) {
    const picks = PICKS_BY_UID[user.uid] ?? [];
    const accum = scoresByUid.get(user.uid)!;

    for (const pick of picks) {
      const match = matchMap.get(pick.matchId);
      if (!match) continue;

      const isScheduled = match.status === "scheduled";
      const isLate = pick.isLate ?? false;
      const pickType = inferPickType(match);

      // Calcular scoring solo para partidos finished
      let predictionScore: ReturnType<typeof calculatePredictionScore> | null = null;

      if (!isScheduled) {
        const partialPrediction: Partial<Prediction> = {
          pick: pick.pick,
          pickType,
          isLate,
        };
        predictionScore = calculatePredictionScore(partialPrediction, match);

        // Acumular al score del usuario
        accum.totalPoints += predictionScore.points;
        accum.totalCorrect += predictionScore.totalCorrect ?? 0;
        accum.correctGroupPicks += predictionScore.correctGroupPicks ?? 0;
        accum.correctAdvancingPicks += predictionScore.correctAdvancingPicks ?? 0;
        accum.validPredictions += predictionScore.validPredictions ?? 0;
        accum.latePredictions += predictionScore.latePredictions ?? 0;
      }

      // Construir doc de predicción
      const predictionDoc: Record<string, unknown> = {
        uid: user.uid,
        matchId: pick.matchId,
        pickType,
        pick: pick.pick,
        submittedAt: toTimestamp(nowPlusMinutes(isLate ? 30 : -120)), // tardío = 30min antes del kickoff
        isLate,
        status: isLate ? "late" : "valid",
        points: predictionScore?.points ?? 0,
        isCorrect: predictionScore?.isCorrect ?? null,
        scoringReason: predictionScore?.scoringReason ?? "Pendiente de resultado",
        totalCorrect: predictionScore?.totalCorrect ?? 0,
      };

      const docId = `${user.uid}_${pick.matchId}`;
      batch.set(
        db.collection("groups").doc(GROUP_ID).collection("predictions").doc(docId),
        predictionDoc,
      );

      batchCount++;
      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) await batch.commit();

  // Escribir scores
  const scoreBatch = db.batch();
  for (const [uid, accum] of scoresByUid) {
    scoreBatch.set(
      db.collection("groups").doc(GROUP_ID).collection("scores").doc(uid),
      { ...accum, updatedAt: FieldValue.serverTimestamp() },
    );
  }
  await scoreBatch.commit();

  return scoresByUid;
}

// ── Paso 8: Premios ───────────────────────────────────────────────────────────

async function seedPrizes(scoresByUid: Map<string, ScoreAccum>) {
  const scoresList = Array.from(scoresByUid.values()) as Score[];
  const prizes = calculatePrizeAllocations(scoresList, 200);

  const batch = db.batch();
  for (const prize of prizes) {
    batch.set(
      db.collection("groups").doc(GROUP_ID).collection("prizes").doc(prize.uid),
      { ...prize, updatedAt: FieldValue.serverTimestamp() },
    );
  }
  await batch.commit();
  return prizes;
}

// ── Paso 9: AuditLog ─────────────────────────────────────────────────────────

async function seedAuditLog() {
  await db.collection("auditLogs").add({
    actorUid: "uid-admin",
    groupId: GROUP_ID,
    action: "seed",
    entityType: "group",
    entityId: GROUP_ID,
    after: { note: "Seed de emulador ejecutado por script" },
    createdAt: FieldValue.serverTimestamp(),
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("  🌎  La Cancha — Iniciando seed...");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    log("🔧 Configurando systemConfig...");
    await seedSystemConfig();

    log(`👤 Creando ${USERS.length} usuarios...`);
    await seedUsers();

    log("🏟️  Creando grupo \"Liga del Taco 2026\"...");
    await seedGroup();

    log(`👥 Añadiendo ${PARTICIPANTS.length} members...`);
    await seedMembers();

    log(`⚽ Cargando ${MATCHES.length} partidos...`);
    const matchMap = await seedMatches();

    log("🎯 Escribiendo predicciones y calculando scores...");
    const scoresByUid = await seedPredictionsAndScores(matchMap);

    log("🏆 Calculando premios...");
    const prizes = await seedPrizes(scoresByUid);

    await seedAuditLog();

    // ── Resumen ──────────────────────────────────────────────────────────────

    const finishedCount = MATCHES.filter(m => m.status === "finished").length;
    const scheduledCount = MATCHES.filter(m => m.status === "scheduled").length;
    const totalPredictions = PARTICIPANTS.reduce(
      (sum, u) => sum + (PICKS_BY_UID[u.uid]?.length ?? 0),
      0,
    );

    log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    log("  🌎  La Cancha — Seed completado");
    log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    log(`✅ ${USERS.length} usuarios (Auth + /users)`);
    log(`✅ 1 grupo: "Liga del Taco 2026"  (id: ${GROUP_ID})`);
    log(`✅ ${PARTICIPANTS.length} members`);
    log(`✅ ${MATCHES.length} partidos (${finishedCount} finished, ${scheduledCount} scheduled)`);
    log(`✅ ${totalPredictions} predicciones escritas`);
    log("");
    log("📊 Ranking:");

    const ranked = rankScores(Array.from(scoresByUid.values()) as Score[]);
    const prizeMap = new Map(prizes.map(p => [p.uid, p]));
    const userMap = new Map(USERS.map(u => [u.uid, u]));

    for (const score of ranked) {
      const user = userMap.get(score.uid)!;
      const prize = prizeMap.get(score.uid);
      const medal = score.position === 1 ? "🥇" : score.position === 2 ? "🥈" : score.position === 3 ? "🥉" : ` ${score.position}.`;
      const prizeStr = prize && prize.estimatedPrize > 0
        ? `  $${prize.estimatedPrize.toFixed(0)} MXN`
        : "  $0";
      const payNote = user.paymentStatus === "pending" ? "  (pago pendiente)" : "";
      const tieNote = prize?.tieApplied ? "  (empate)" : "";
      log(`  ${medal} ${score.displayName?.padEnd(18)} ${String(score.totalPoints).padStart(2)} aciertos${prizeStr}${tieNote}${payNote}`);
    }

    log("");
    log(`  Bolsa total: $${PARTICIPANTS.length * 200} MXN (${PARTICIPANTS.length} × $200)`);
    log("");
    log("🔐 Credenciales de prueba (password: Test1234!):");
    for (const u of USERS) {
      const role = u.roleGlobal === "platform_admin" ? "  [admin]" : u.isGroupAdmin ? "  [group admin]" : "";
      log(`   ${u.email}${role}`);
    }
    log("");
    log("🌐 Emulator UI:  http://localhost:4000");
    log("🚀 App (emulador): NEXT_PUBLIC_USE_EMULATOR=true npm run dev");
    log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Error durante el seed:", err);
    process.exit(1);
  }
}

main();
