import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, format } from "date-fns";
import type { TimelineCategory, TimelineEvent } from "@/lib/timelineEvents";
import {
  buildTicks,
  clampSpan,
  clusterEvents,
  createScale,
  type TimelineCluster,
} from "./timelineScale";

const LANES: { key: TimelineCategory; label: string; color: string }[] = [
  { key: "maintenance", label: "Maintenance", color: "hsl(var(--timeline-maintenance))" },
  { key: "directives", label: "Directives", color: "hsl(var(--timeline-directives))" },
  { key: "financial", label: "Financial", color: "hsl(var(--timeline-financial))" },
  { key: "counters", label: "Counters", color: "hsl(var(--timeline-counters))" },
];

const HEADER_H = 30;
const LANE_H = 56;
const LABEL_W = 132;

interface TimelineAxisProps {
  events: TimelineEvent[];
  center: Date;
  spanDays: number;
  onCenterChange: (date: Date) => void;
  onSpanChange: (days: number) => void;
  onSelect: (cluster: TimelineCluster) => void;
  selectedId?: string | null;
}

export function TimelineAxis({
  events,
  center,
  spanDays,
  onCenterChange,
  onSpanChange,
  onSelect,
  selectedId,
}: TimelineAxisProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const dragRef = useRef<{ x: number; center: Date } | null>(null);

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const scale = useMemo(
    () => createScale(center, spanDays, Math.max(width, 1)),
    [center, spanDays, width]
  );
  const ticks = useMemo(() => (width > 0 ? buildTicks(scale) : []), [scale, width]);

  const lanes = useMemo(
    () =>
      LANES.map((lane) => ({
        ...lane,
        clusters:
          width > 0
            ? clusterEvents(
                events.filter((e) => e.category === lane.key),
                scale
              )
            : [],
      })),
    [events, scale, width]
  );

  const todayX = scale.x(new Date());

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      const rect = plotRef.current?.getBoundingClientRect();
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      const next = clampSpan(spanDays * factor);
      if (rect && width > 0) {
        // keep the date under the cursor fixed while zooming
        const px = e.clientX - rect.left;
        const anchor = scale.dateAt(px);
        const ratio = px / width;
        const newStartMs = anchor.getTime() - ratio * next * 86400000;
        onCenterChange(new Date(newStartMs + (next / 2) * 86400000));
      }
      onSpanChange(next);
    },
    [onCenterChange, onSpanChange, scale, spanDays, width]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, center };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || width === 0) return;
    const dxDays = ((drag.x - e.clientX) / width) * spanDays;
    onCenterChange(addDays(drag.center, dxDays));
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const totalHeight = HEADER_H + LANES.length * LANE_H;

  return (
    <div className="flex select-none">
      <div className="shrink-0" style={{ width: LABEL_W }}>
        <div style={{ height: HEADER_H }} />
        {LANES.map((lane) => (
          <div
            key={lane.key}
            className="flex items-center gap-2 border-t border-border/60 pl-4 text-sm text-muted-foreground"
            style={{ height: LANE_H }}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: lane.color }}
            />
            {lane.label}
          </div>
        ))}
      </div>

      <div
        ref={plotRef}
        className="relative flex-1 cursor-grab overflow-hidden active:cursor-grabbing"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <svg width="100%" height={totalHeight} role="img" aria-label="Timeline axis">
          {/* tick grid */}
          {ticks.map((tick) => (
            <g key={tick.date.toISOString()}>
              <line
                x1={tick.x}
                x2={tick.x}
                y1={HEADER_H - 6}
                y2={totalHeight}
                stroke="hsl(var(--border))"
                strokeWidth={tick.major ? 1.25 : 0.75}
                opacity={tick.major ? 0.9 : 0.5}
              />
              <text
                x={tick.x + 4}
                y={14}
                fontSize={11}
                fill="hsl(var(--muted-foreground))"
                opacity={0.85}
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* lane baselines */}
          {LANES.map((lane, i) => {
            const y = HEADER_H + i * LANE_H;
            return (
              <g key={lane.key}>
                <line
                  x1={0}
                  x2="100%"
                  y1={y}
                  y2={y}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                  opacity={0.6}
                />
                <line
                  x1={0}
                  x2="100%"
                  y1={y + LANE_H / 2}
                  y2={y + LANE_H / 2}
                  stroke="hsl(var(--border))"
                  strokeDasharray="2 6"
                  opacity={0.5}
                />
              </g>
            );
          })}

          {/* today pivot */}
          {todayX >= 0 && todayX <= width && (
            <g>
              <line
                x1={todayX}
                x2={todayX}
                y1={HEADER_H - 10}
                y2={totalHeight}
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
              />
              <text
                x={todayX + 5}
                y={HEADER_H - 14}
                fontSize={11}
                fontWeight={600}
                fill="hsl(var(--primary))"
              >
                Today
              </text>
            </g>
          )}

          {/* markers */}
          {lanes.map((lane, i) => {
            const cy = HEADER_H + i * LANE_H + LANE_H / 2;
            return (
              <g key={lane.key}>
                {lane.clusters.map((cluster) => (
                  <Marker
                    key={cluster.id}
                    cluster={cluster}
                    cy={cy}
                    color={lane.color}
                    selected={selectedId === cluster.id}
                    onSelect={onSelect}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function Marker({
  cluster,
  cy,
  color,
  selected,
  onSelect,
}: {
  cluster: TimelineCluster;
  cy: number;
  color: string;
  selected: boolean;
  onSelect: (cluster: TimelineCluster) => void;
}) {
  const count = cluster.events.length;
  const primary = cluster.events[0];
  const confidence = cluster.events.some((e) => e.confidence === "actual")
    ? "actual"
    : cluster.events.some((e) => e.confidence === "scheduled")
      ? "scheduled"
      : "projected";

  const tooltip =
    count === 1
      ? `${primary.title} — ${format(primary.date, "d MMM yyyy")}`
      : `${count} events — ${format(cluster.date, "d MMM yyyy")}`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(cluster);
  };

  if (count > 1) {
    const w = count > 9 ? 30 : 24;
    return (
      <g className="cursor-pointer" onClick={handleClick} onPointerDown={(e) => e.stopPropagation()}>
        <title>{tooltip}</title>
        <rect
          x={cluster.x - w / 2}
          y={cy - 10}
          width={w}
          height={20}
          rx={10}
          fill={color}
          opacity={confidence === "projected" ? 0.45 : 0.9}
          stroke={selected ? "hsl(var(--foreground))" : "transparent"}
          strokeWidth={1.5}
        />
        <text
          x={cluster.x}
          y={cy + 4}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill="hsl(var(--background))"
        >
          {count}
        </text>
      </g>
    );
  }

  return (
    <g className="cursor-pointer" onClick={handleClick} onPointerDown={(e) => e.stopPropagation()}>
      <title>{tooltip}</title>
      <circle
        cx={cluster.x}
        cy={cy}
        r={selected ? 8 : 6}
        fill={confidence === "actual" ? color : "hsl(var(--card))"}
        stroke={color}
        strokeWidth={2}
        strokeDasharray={confidence === "projected" ? "3 2" : undefined}
      />
    </g>
  );
}

export default TimelineAxis;
