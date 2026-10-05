import { redirect } from "next/navigation";

export default function VideoPanelRedirect() {
  redirect("/admin/videos/");
}
