import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getAffiliateLinkStats,
  getAffiliateMarketplaceOptions,
  listAffiliateLinksPage,
} from "@/lib/affiliate-links";
import AffiliateCenterClient from "./AffiliateCenterClient";

export const dynamic = "force-dynamic";

export default async function AffiliateCenterPage() {
  const cookieStore = await cookies();
  const request = new Request("https://www.vetor.blog/admin/afiliados/", {
    headers: { cookie: cookieStore.toString() },
  });

  if (!isAdminAuthenticated(request)) {
    redirect("/admin/login/");
  }

  const [page, stats, marketplaces] = await Promise.all([
    listAffiliateLinksPage({ limit: 50, offset: 0 }),
    getAffiliateLinkStats(),
    getAffiliateMarketplaceOptions(),
  ]);

  const buildVersion = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || 'local';

  return (
    <AffiliateCenterClient
      initialLinks={page.data}
      initialTotal={page.total}
      initialStats={stats}
      initialMarketplaces={marketplaces}
      generatedAt={new Date().toISOString()}
      buildVersion={process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || 'local'}
    />
  );
}
