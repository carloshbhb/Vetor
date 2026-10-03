import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getAffiliateLinkStats,
  getAffiliateMarketplaceOptions,
  listAffiliateLinks,
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

  const [links, stats, marketplaces] = await Promise.all([
    listAffiliateLinks({ limit: 200 }),
    getAffiliateLinkStats(),
    getAffiliateMarketplaceOptions(),
  ]);

  return (
    <AffiliateCenterClient
      initialLinks={links}
      initialStats={stats}
      initialMarketplaces={marketplaces}
    />
  );
}
