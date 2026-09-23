# Performance pass

## Baseline

- The main application view was one large client component.
- Recharts was imported into that client component even when the visible page did not contain a chart.
- The largest generated client chunk was 1,150,690 bytes.
- The complete generated static chunk directory was 1,809,181 bytes.

## Changes in this pass

- Moved report and workload Recharts markup into `src/components/ui/report-charts.tsx`.
- Loaded chart UI with `next/dynamic` and a lightweight skeleton, so chart code is deferred until the related section is rendered.
- Removed the unused legacy `Dashboard` composition that kept chart imports in the main module.
- Enabled Next.js package import optimization for `date-fns`, `lucide-react`, `react-icons`, and `recharts`.
- Preserved the existing chart data, labels, colors, empty states, and shared section-title styling.

## Validation

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run build` — passed.
- `git diff --check` — passed.

After the split, the largest generated client chunk is 668,690 bytes. The chart code remains available in a deferred chunk, but it is no longer part of the first large application module. This is the important initial-load improvement; total generated assets can stay similar because deferred code still has to be downloaded when a chart is opened.

## Next optimization opportunities

1. Measure real mobile performance with Lighthouse and Web Vitals on the Vercel Preview.
2. Split the remaining monolithic client application into route-level views and shared state modules.
3. Memoize repeated calendar lookups and derived product/platform maps after profiling.
4. Audit uploaded logo and content images for dimensions, format, and responsive loading.
5. Add a CI performance budget for the main client chunk and route-level Lighthouse checks.
