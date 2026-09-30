import { BellRing, Gauge, Lock } from "lucide-react";
import { Accent } from "./sections";
import { WaitlistForm } from "./waitlist";

const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(n);

const POINTS = [
  { icon: Gauge, title: "Your resume, your ranking", body: "Postings scored against your own skills, seniority and location rules." },
  { icon: BellRing, title: "Ten a morning", body: "The best new matches in Telegram at 08:00 IST, the rest in the inbox." },
  { icon: Lock, title: "Your details stay put", body: "Used only to contact you about Scout. One link deletes them." },
];

export function WaitlistSection({ referral, count, showCount }: { referral: string | null; count: number; showCount: boolean }) {
  return (
    <section id="waitlist" aria-labelledby="waitlist-title" className="relative scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
      <div className="relative mx-auto max-w-[1120px]" data-reveal>
        <div aria-hidden className="absolute -inset-x-10 -inset-y-16 -z-10 bg-[radial-gradient(ellipse_55%_50%_at_70%_50%,rgb(168_85_247/0.16),transparent),radial-gradient(ellipse_45%_45%_at_25%_40%,rgb(99_102_241/0.14),transparent)] blur-2xl" />
        <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[1fr_minmax(0,500px)] lg:gap-16">
          <div>
            <p className="lx-eyebrow">Early access</p>
            <h2 id="waitlist-title" className="mt-4 max-w-[14ch] text-[2.3rem] leading-[1] font-semibold tracking-[-0.045em] text-balance text-fg sm:text-[3.4rem]">
              Get Scout for <Accent>your</Accent> job hunt.
            </h2>
            <p className="mt-5 max-w-[34rem] text-[15.5px] leading-relaxed text-pretty text-fg-muted sm:text-[17px]">
              Scout is in private beta and currently used by its builder. Join the waitlist and you&apos;ll hear first when there&apos;s room for more people. No launch date yet, and no spam.
            </p>
            <ul className="mt-8 grid max-w-md gap-4">
              {POINTS.map((p) => (
                <li key={p.title} className="flex items-start gap-3.5">
                  <span className="lx-glass flex size-9 shrink-0 items-center justify-center rounded-xl text-accent">
                    <p.icon className="size-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-[14px] font-medium text-fg">{p.title}</span>
                    <span className="block text-[13.5px] text-fg-muted">{p.body}</span>
                  </span>
                </li>
              ))}
            </ul>
            {showCount && (
              <p className="mt-8 text-[13.5px] text-fg-muted" data-testid="wl-count">
                Join <span className="font-mono font-semibold text-fg tabular-nums">{fmt(count)}</span> others on the list.
              </p>
            )}
          </div>
          <div className="lx-glass relative rounded-[26px] p-5 shadow-[var(--lx-glow)] sm:p-8">
            <div aria-hidden className="pointer-events-none absolute inset-x-8 -top-px h-px bg-[linear-gradient(90deg,transparent,rgb(168_85_247/0.7),transparent)]" />
            <WaitlistForm referral={referral} />
          </div>
        </div>
      </div>
    </section>
  );
}
