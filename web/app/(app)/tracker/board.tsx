"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { ChevronDown, Clock, GripVertical, TriangleAlert } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { addFeedback } from "@/lib/actions";
import type { TrackerCard, TrackerStage } from "@/lib/queries";
import { handleResult } from "@/lib/toast";
import { cn, daysSince, formatDateTime, pct } from "@/lib/utils";

const COLUMNS: { id: TrackerStage; label: string; dot: string }[] = [
  { id: "saved", label: "Saved", dot: "bg-fg-subtle" },
  { id: "applied", label: "Applied", dot: "bg-accent" },
  { id: "interview", label: "Interview", dot: "bg-warn" },
  { id: "offer", label: "Offer", dot: "bg-good" },
  { id: "rejected", label: "Rejected", dot: "bg-bad" },
];

export function Board({ initial }: { initial: TrackerCard[] }) {
  const router = useRouter();
  const [cards, setCards] = useState(initial);
  const [active, setActive] = useState<TrackerCard | null>(null);
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const onEnd = async (e: DragEndEvent) => {
    setActive(null);
    const card = cards.find((c) => c.id === Number(e.active.id));
    const to = e.over?.id as TrackerStage | undefined;
    if (!card || !to || card.stage === to) return;
    const prev = cards;
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, stage: to, movedAt: new Date().toISOString() } : c)));
    const res = await addFeedback(card.id, to);
    if (handleResult(res, `${card.companyName} → ${COLUMNS.find((c) => c.id === to)!.label}`)) router.refresh();
    else setCards(prev);
  };

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      onDragStart={(e) => setActive(cards.find((c) => c.id === Number(e.active.id)) ?? null)}
      onDragEnd={onEnd}
      onDragCancel={() => setActive(null)}
      accessibility={{ screenReaderInstructions: { draggable: "Press space to pick up a job, arrow keys to move between stages, space to drop." } }}
    >
      <div className="ap-stagger -mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8 xl:grid xl:grid-cols-5 xl:overflow-visible">
        {COLUMNS.map((col) => (
          <Column key={col.id} col={col} cards={cards.filter((c) => c.stage === col.id)} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>{active && <CardView card={active} overlay />}</DragOverlay>
    </DndContext>
  );
}

const STEP = 20;

function Column({ col, cards }: { col: (typeof COLUMNS)[number]; cards: TrackerCard[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const [limit, setLimit] = useState(STEP);
  const shown = cards.slice(0, limit);
  const left = cards.length - shown.length;
  return (
    <section
      ref={setNodeRef}
      aria-label={`${col.label} column`}
      data-testid={`column-${col.id}`}
      className={cn(
        "flex w-[82vw] max-w-[300px] shrink-0 snap-start flex-col rounded-xl border bg-surface-2/70 transition-colors sm:w-72 xl:w-auto xl:max-w-none",
        isOver ? "border-accent/60 bg-accent-soft/40" : "border-border",
      )}
    >
      <header className="flex items-center gap-2 px-3 py-2.5">
        <span className={cn("size-2 rounded-full", col.dot)} aria-hidden />
        <h2 className="text-[13px] font-semibold">{col.label}</h2>
        <span className="ml-auto rounded-full bg-muted px-2 font-mono text-[11px] tabular-nums text-fg-muted">{cards.length}</span>
      </header>
      <div className="flex min-h-40 flex-1 flex-col gap-2 px-2 pb-2">
        {shown.map((c) => (
          <DraggableCard key={c.id} card={c} />
        ))}
        {left > 0 && (
          <button
            type="button"
            onClick={() => setLimit((l) => l + STEP)}
            data-testid={`show-more-${col.id}`}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-xs font-medium text-fg-muted transition-colors outline-none hover:border-border-strong hover:bg-surface hover:text-fg focus-visible:ring-3 focus-visible:ring-ring/40 pointer-coarse:h-11 [&_svg]:size-3.5"
          >
            <ChevronDown aria-hidden />
            Show {Math.min(STEP, left)} more
            <span className="font-mono tabular-nums text-fg-subtle">({left} left)</span>
          </button>
        )}
        {cards.length === 0 && <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border px-3 py-8 text-center text-xs text-fg-subtle">Drop a job here</p>}
      </div>
    </section>
  );
}

function DraggableCard({ card }: { card: TrackerCard }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: String(card.id) });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={cn("touch-manipulation", isDragging && "opacity-40")} aria-label={`${card.title} at ${card.companyName}`}>
      <CardView card={card} />
    </div>
  );
}

function CardView({ card, overlay }: { card: TrackerCard; overlay?: boolean }) {
  const d = daysSince(card.movedAt);
  const stale = d >= 7 && (card.stage === "applied" || card.stage === "saved");
  return (
    <article
      data-testid="tracker-card"
      className={cn(
        "group cursor-grab rounded-lg border border-border bg-surface p-3 shadow-card transition-colors hover:border-border-strong active:cursor-grabbing",
        overlay ? "rotate-1 shadow-pop" : "ap-lift",
      )}
    >
      <div className="flex items-start gap-2.5">
        <CompanyLogo name={card.companyName} domain={card.companyDomain} size={28} className="rounded-md" />
        <div className="min-w-0 flex-1">
          <Link href={`/job/${card.id}`} className="line-clamp-2 text-[13px] leading-snug font-medium text-fg hover:text-accent" onPointerDown={(e) => e.stopPropagation()}>
            {card.title}
          </Link>
          <p className="mt-0.5 truncate text-xs text-fg-muted">{card.companyName}</p>
          {card.closedAt && card.stage !== "rejected" && card.stage !== "offer" && (
            <p data-testid="closed-warning" className="mt-1.5 inline-flex items-center gap-1 rounded bg-bad-soft px-1.5 py-0.5 text-[11px] font-medium text-bad" title={`Posting closed ${formatDateTime(card.closedAt)}`}>
              <TriangleAlert className="size-3" aria-hidden />
              Closed
            </p>
          )}
        </div>
        <GripVertical className="size-4 shrink-0 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[11px]">
        <span className={cn("inline-flex items-center gap-1", stale ? "text-warn" : "text-fg-subtle")} title="Days since last move">
          <Clock className="size-3" aria-hidden />
          {d === 0 ? "today" : `${d}d`}
        </span>
        <span className="font-mono tabular-nums text-fg-subtle">{pct(card.fitProb)} fit</span>
      </div>
    </article>
  );
}
