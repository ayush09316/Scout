"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { saveProfile } from "@/lib/actions";
import type { Preferences } from "@/lib/db/schema";
import { handleResult } from "@/lib/toast";
import { timeAgo } from "@/lib/utils";

type Profile = { version: number; resumeMd: string; preferences: Preferences; createdAt: string } | null;

const input = "h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg shadow-card placeholder:text-fg-subtle hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring";

function TagInput({ id, value, onChange, placeholder }: { id: string; value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim().replace(/,$/, "");
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface p-1.5 shadow-card focus-within:border-accent focus-within:ring-2 focus-within:ring-ring">
      {value.map((t) => (
        <span key={t} className="inline-flex h-6 items-center gap-1 rounded-md bg-muted pr-1 pl-2 text-xs font-medium text-fg">
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="rounded p-0.5 text-fg-subtle hover:bg-border hover:text-fg">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length ? "" : placeholder}
        className="h-6 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-fg-subtle"
      />
    </div>
  );
}

function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-fg">
        {label}
      </label>
      {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const p = profile?.preferences ?? {};
  const [resume, setResume] = useState(profile?.resumeMd ?? "");
  const [roles, setRoles] = useState<string[]>(p.roles ?? []);
  const [locations, setLocations] = useState<string[]>(p.locations ?? []);
  const [skills, setSkills] = useState<string[]>(p.skills ?? []);
  const [dealbreakers, setDealbreakers] = useState<string[]>(p.dealbreakers ?? []);
  const [remote, setRemote] = useState(String(p.remote ?? "any"));
  const [minExp, setMinExp] = useState(p.min_exp ?? 0);
  const [maxExp, setMaxExp] = useState(p.max_exp ?? 10);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const prefs: Preferences = { ...p, roles, locations, skills, dealbreakers, remote: remote as Preferences["remote"], min_exp: minExp, max_exp: maxExp };
      const res = await saveProfile(resume, prefs);
      handleResult(res, res.ok ? `Saved as profile v${res.data?.version}` : undefined);
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-6"
    >
      <Card>
        <CardHeader
          title="Resume"
          description="Markdown. Embedded and sent to scorers as the candidate profile."
          action={profile && <Badge tone="accent">v{profile.version} · {timeAgo(profile.createdAt)} ago</Badge>}
        />
        <div className="p-4">
          <label htmlFor="resume" className="sr-only">
            Resume
          </label>
          <textarea
            id="resume"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            rows={14}
            className="w-full resize-y rounded-lg border border-border bg-surface-2/50 p-3 font-mono text-[13px] leading-relaxed text-fg focus:border-accent focus:ring-2 focus:ring-ring focus:outline-none"
            placeholder="# Your name&#10;Paste your resume as markdown…"
          />
          <p className="mt-1.5 text-xs text-fg-subtle">{resume.split(/\s+/).filter(Boolean).length} words</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Preferences" description="Hard filters run before any LLM call. Press Enter to add a tag." />
        <div className="grid gap-5 p-4 sm:grid-cols-2">
          <Field label="Target roles" htmlFor="roles">
            <TagInput id="roles" value={roles} onChange={setRoles} placeholder="Backend Engineer" />
          </Field>
          <Field label="Locations" htmlFor="locations">
            <TagInput id="locations" value={locations} onChange={setLocations} placeholder="Bengaluru" />
          </Field>
          <Field label="Skills" hint="Used for the skills-match panel" htmlFor="skills">
            <TagInput id="skills" value={skills} onChange={setSkills} placeholder="Python" />
          </Field>
          <Field label="Dealbreakers" hint="Jobs mentioning these are dropped" htmlFor="dealbreakers">
            <TagInput id="dealbreakers" value={dealbreakers} onChange={setDealbreakers} placeholder="night shift" />
          </Field>
          <Field label="Remote" htmlFor="remote">
            <select id="remote" value={remote} onChange={(e) => setRemote(e.target.value)} className={input}>
              <option value="any">Remote or on-site</option>
              <option value="remote_only">Remote only</option>
              <option value="onsite_ok">On-site in my locations</option>
            </select>
          </Field>
          <Field label="Experience (years)" htmlFor="min_exp">
            <div className="flex items-center gap-2">
              <input id="min_exp" type="number" min={0} max={30} value={minExp} onChange={(e) => setMinExp(Number(e.target.value))} className={input} aria-label="Minimum years" />
              <span className="text-fg-subtle">–</span>
              <input type="number" min={0} max={40} value={maxExp} onChange={(e) => setMaxExp(Number(e.target.value))} className={input} aria-label="Maximum years" />
            </div>
          </Field>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-3">
          <p className="mr-auto text-xs text-fg-subtle">Saving creates v{(profile?.version ?? 0) + 1}.</p>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" />}
            Save profile
          </Button>
        </div>
      </Card>
    </form>
  );
}
