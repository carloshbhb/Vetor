export type AffiliateStatRow = {
  status: string | null;
  health_status: string | null;
  total_clicks: number | null;
  destination_url: string | null;
  last_checked_at: string | null;
  http_status: number | null;
};

export type AffiliateLinkStats = {
  total: number;
  active: number;
  paused: number;
  broken: number;
  archived: number;
  unchecked: number;
  blockedChecks: number;
  healthErrors: number;
  pendingLinks: number;
  clicks: number;
};

export function summarizeAffiliateLinkStats(rows: AffiliateStatRow[]): AffiliateLinkStats {
  return rows.reduce<AffiliateLinkStats>((stats, row) => {
    stats.total += 1;
    if (row.status === "active") stats.active += 1;
    if (row.status === "paused") stats.paused += 1;
    if (row.status === "broken") stats.broken += 1;
    if (row.status === "archived") stats.archived += 1;
    if (!row.last_checked_at) stats.unchecked += 1;
    if (
      row.last_checked_at &&
      row.health_status === "unknown" &&
      [401, 403, 429].includes(Number(row.http_status))
    ) stats.blockedChecks += 1;
    if (row.health_status === "error") stats.healthErrors += 1;
    if (!String(row.destination_url || "").trim()) stats.pendingLinks += 1;
    stats.clicks += Number(row.total_clicks || 0);
    return stats;
  }, {
    total: 0,
    active: 0,
    paused: 0,
    broken: 0,
    archived: 0,
    unchecked: 0,
    blockedChecks: 0,
    healthErrors: 0,
    pendingLinks: 0,
    clicks: 0,
  });
}
