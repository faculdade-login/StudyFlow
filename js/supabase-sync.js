/**
 * Controle de sincronizacao com Supabase para reduzir chamadas repetidas.
 */

import { syncProfileStats } from './supabase-data.js';

const STATS_DEBOUNCE_MS = 2500;
const RANKING_TTL_MS = 90_000;

let statsTimer = null;
let pendingStats = null;
let rankingFetchedAt = 0;
let rankingInFlight = null;

export function isRankingStale() {
  return !rankingFetchedAt || Date.now() - rankingFetchedAt >= RANKING_TTL_MS;
}

export function markRankingFetched() {
  rankingFetchedAt = Date.now();
}

export function scheduleProfileStatsSync(userId, lessonsCompleted, hoursStudied) {
  pendingStats = { userId, lessonsCompleted, hoursStudied };
  clearTimeout(statsTimer);
  statsTimer = setTimeout(() => {
    flushProfileStatsSync().catch(console.error);
  }, STATS_DEBOUNCE_MS);
}

export async function flushProfileStatsSync() {
  clearTimeout(statsTimer);
  statsTimer = null;
  if (!pendingStats) return;

  const snapshot = pendingStats;
  pendingStats = null;

  await syncProfileStats(
    snapshot.userId,
    snapshot.lessonsCompleted,
    snapshot.hoursStudied
  );
}

export function runRankingRefresh(task) {
  if (rankingInFlight) return rankingInFlight;

  rankingInFlight = task().finally(() => {
    rankingInFlight = null;
  });

  return rankingInFlight;
}

export function resetSyncState() {
  clearTimeout(statsTimer);
  statsTimer = null;
  pendingStats = null;
  rankingFetchedAt = 0;
  rankingInFlight = null;
}

export function registerSyncLifecycle() {
  if (registerSyncLifecycle.done) return;
  registerSyncLifecycle.done = true;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushProfileStatsSync().catch(console.error);
    }
  });
}
