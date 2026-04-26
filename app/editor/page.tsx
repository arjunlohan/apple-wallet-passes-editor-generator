import { EditorShell } from "./_components/EditorShell";

export const dynamic = "force-dynamic";

export default function EditorPage() {
  const defaults = {
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_IDENTIFIER ?? "",
    teamIdentifier: process.env.APPLE_TEAM_IDENTIFIER ?? "",
  };
  return (
    <div className="dark flex flex-1 flex-col bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/50">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-1 px-4 py-6">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Apple Wallet
          </span>
          <h1 className="font-heading text-3xl font-medium leading-tight">
            Pass editor
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick a template, edit the fields, drop an icon.
          </p>
        </div>
      </header>
      <EditorShell defaults={defaults} />
    </div>
  );
}
