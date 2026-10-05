import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getAffiliateLinkStats,
  getAffiliateMarketplaceOptions,
  listAffiliateLinksPage,
  syncPublishedReviewAffiliateLinks,
} from "@/lib/affiliate-links";
import AffiliateCenterClient from "./AffiliateCenterClient";

export const dynamic = "force-dynamic";

export default async function AffiliateCenterPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const request = new Request("https://www.vetor.blog/admin/afiliados/", {
    headers: { cookie: cookieHeader },
  });

  if (!isAdminAuthenticated(request)) {
    redirect("/admin/login/");
  }

  await syncPublishedReviewAffiliateLinks();

  const [page, stats, marketplaces] = await Promise.all([
    listAffiliateLinksPage({ limit: 50, offset: 0 }),
    getAffiliateLinkStats(),
    getAffiliateMarketplaceOptions(),
  ]);

  return (
    <AffiliateCenterClient
      initialLinks={page.data}
      initialTotal={page.total}
      initialStats={stats}
      initialMarketplaces={marketplaces}
    />
  );
}
