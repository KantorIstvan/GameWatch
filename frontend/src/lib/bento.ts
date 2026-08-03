/**
 * Keeping the last row of a bento grid flush.
 *
 * A bento layout only reads as deliberate while every row is full - a single tile
 * stranded beside empty space looks like something failed to load rather than like a
 * layout choice. Tile counts on the statistics pages are data-dependent (a stat is
 * dropped entirely when its value is undefined), so the count is not knowable at author
 * time and the final tile absorbs whatever the last row is short by instead of every
 * caller hand-checking the combinations.
 *
 * Written for the project's standard `grid-cols-2 md:grid-cols-4` stat grid.
 */

import { cn } from '@/lib/utils'

/** Literal class names, so Tailwind's source scanner can see every span that ships. */
const SPAN: Record<number, string> = {
  1: '',
  2: 'col-span-2',
}

const MD_SPAN: Record<number, string> = {
  1: '',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
}

/** Columns the final tile must cover for a row of `columns` to end flush. */
function lastTileSpan(count: number, columns: number): number {
  const remainder = count % columns
  return remainder === 0 ? 1 : columns - remainder + 1
}

/**
 * Class for the last tile of a `grid-cols-2 md:grid-cols-4` grid holding `count` tiles.
 *
 * Returns an empty string when the count already divides evenly at both breakpoints.
 */
export function bentoLastTile(count: number): string {
  if (count <= 0) {
    return ''
  }
  return cn(SPAN[lastTileSpan(count, 2)], MD_SPAN[lastTileSpan(count, 4)])
}
