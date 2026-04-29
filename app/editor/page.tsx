import { redirect } from "next/navigation";

// Editor now lives at "/". Keep this route as a permanent redirect so any
// existing backlinks (README, blog posts, social) still land on the editor.
export default function LegacyEditorPage(): never {
  redirect("/");
}
