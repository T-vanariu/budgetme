export function SummaryTiles({ tiles }: { tiles: { label: string; value: string; hint?: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-[10px] md:grid-cols-4 md:gap-4">
      {tiles.map((t) => (
        <div key={t.label} className="card min-w-0 !p-3 md:!p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{t.label}</dt>
          <dd className="num mt-1 truncate font-display text-xl font-semibold">{t.value}</dd>
          {t.hint && <dd className="truncate text-xs text-muted">{t.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
