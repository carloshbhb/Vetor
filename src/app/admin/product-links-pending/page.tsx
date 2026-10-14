import { cookies } from "next/headers";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getProductLinksWaitingForAffiliate } from "@/lib/product-links";
import ProductLinksPendingClient from "./ProductLinksPendingClient";

export const dynamic = "force-dynamic";

export default async function ProductLinksPendingPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const request = new Request("http://localhost", {
    headers: { cookie: cookieHeader },
  });

  if (!isAdminAuthenticated(request)) {
    return (
      <div className="py-20 text-center text-[var(--muted)]">
        Nao autorizado. Faca login no painel admin.
      </div>
    );
  }

  const { data } = await getProductLinksWaitingForAffiliate(0, 50);
  return <ProductLinksPendingClient initialLinks={data ?? []} />;
}
