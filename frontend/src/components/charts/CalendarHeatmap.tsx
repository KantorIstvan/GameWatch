import { useEffect, useId, useRef } from 'react'
import CalHeatmap from 'cal-heatmap'
import 'cal-heatmap/cal-heatmap.css'
import Tooltip from 'cal-heatmap/plugins/Tooltip'
import LegendLite from 'cal-heatmap/plugins/LegendLite'
import { useTheme } from '../../contexts/ThemeContext'
import { useWeekStart } from '../../contexts/WeekStartContext'
import { cn } from '@/lib/utils'

export interface CalendarHeatmapColorScale {
  /** Cell colors from lowest to highest, one more entry than `domain` (cal-heatmap
   *  threshold convention) - index 0 paints days with no recorded value. */
  range: string[]
  /** Ascending breakpoints splitting values into `range.length` buckets. */
  domain: number[]
}

interface CalendarHeatmapProps {
  /** ISO date string ("yyyy-MM-dd") to plotted value, e.g. from a daily aggregate. */
  data: Record<string, number>
  /** First rendered day (month domain: only year/month are used; week domain: the exact
   *  first day of that week is used). */
  startDate: Date
  colorScale: CalendarHeatmapColorScale
  tooltipText: (timestamp: number, value: number | null) => string
  legendLabel: string
  /** Number of domains (months, or weeks when `domain="week"`) rendered left to right. */
  range?: number
  /** Grouping of subdomain days: a row of months (year-style) or a single week. */
  domain?: 'month' | 'week'
  /** Cell orientation. "day" runs weeks down the columns (the GitHub ribbon, and a
   *  single horizontal strip for a week domain); "xDay" transposes it into a conventional
   *  calendar with weekdays across and weeks stacked down. */
  subDomainType?: 'day' | 'xDay'
  className?: string
}

/**
 * GitHub-style calendar heatmap, shared by the Health and Statistics pages so the
 * cal-heatmap wiring (theming, tooltip/legend plugins, the SVG-viewBox swap that
 * stops the initial paint from visibly "popping" to full size) lives in one place
 * instead of being duplicated per page.
 */
function CalendarHeatmap({ data, startDate, colorScale, tooltipText, legendLabel, range = 12, domain = 'month', subDomainType = 'day', className }: CalendarHeatmapProps) {
  const { mode } = useTheme()
  const { getFirstDayNumber } = useWeekStart()
  // A single week or month is only ~7 columns wide, so it stretches to fill its card
  // rather than scrolling like the year-long ribbon does.
  const isCompact = domain === 'week' || range <= 1
  const containerRef = useRef<HTMLDivElement>(null)
  const legendRef = useRef<HTMLDivElement>(null)
  const calInstanceRef = useRef<CalHeatmap | null>(null)
  // cal-heatmap's legend plugin takes a CSS selector string rather than a node, so the
  // legend container needs an id - sanitized because useId()'s colons aren't valid
  // unescaped in a CSS id selector.
  const legendId = useId().replace(/:/g, '')

  useEffect(() => {
    if (!containerRef.current) return

    if (calInstanceRef.current) {
      calInstanceRef.current.destroy()
    }

    // cal-heatmap's paint() only appends its <svg> after an internal await, so under
    // StrictMode's synchronous mount->cleanup->mount, the cleanup below can fire before
    // that <svg> exists - destroy() then has nothing to remove yet, and the stale
    // instance still appends its <svg> once its paint() promise resolves, producing two
    // stacked grids. `cancelled` lets the resolved callback destroy itself instead.
    let cancelled = false

    const points = Object.entries(data).map(([dateStr, value]) => {
      const [y, m, d] = dateStr.split('-').map(Number)
      return { date: Date.UTC(y, m - 1, d, 12, 0, 0), value }
    })

    const cal = new CalHeatmap()
    calInstanceRef.current = cal

    // A week domain needs its exact start day; a month domain always starts on the 1st
    // regardless of which day of that month `startDate` happens to point at.
    const paintStartDate = domain === 'week'
      ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 12, 0, 0)
      : new Date(startDate.getFullYear(), startDate.getMonth(), 1, 12, 0, 0)

    cal.paint({
      itemSelector: containerRef.current,
      data: {
        source: points,
        x: 'date',
        y: (d: { value: number }) => d.value,
      },
      date: {
        start: paintStartDate,
        locale: { weekStart: getFirstDayNumber() },
      },
      range,
      // Disabled for the same reason as the width/height-to-viewBox swap below: without
      // it the container has no viewBox until paint() resolves, so the browser recomputes
      // CSS h-auto height every animation frame, producing a visible pop to full size.
      animationDuration: 0,
      scale: {
        color: {
          type: 'threshold',
          range: colorScale.range,
          domain: colorScale.domain,
        },
      },
      domain: {
        type: domain,
        gutter: 6,
        label: {
          text: domain === 'week' ? 'MMM D' : 'MMM',
          textAlign: 'start',
          position: 'top',
        },
      },
      // These are intrinsic SVG pixels, not rendered ones - the viewBox swap below scales
      // the whole grid to the container. What they really fix is the gutter-to-cell ratio,
      // so a compact grid's few columns don't inherit gaps a quarter of a cell wide once
      // blown up to full card width.
      subDomain: {
        type: subDomainType,
        radius: isCompact ? 5 : 3,
        width: isCompact ? 20 : 11,
        height: isCompact ? 20 : 11,
        gutter: 3,
      },
    }, [
      [Tooltip, { text: tooltipText }],
      [LegendLite, { itemSelector: `#${legendId}`, label: legendLabel }],
    ]).then(() => {
      if (cancelled) {
        cal.destroy()
        return
      }
      const svg = containerRef.current?.querySelector('svg')
      const width = svg?.getAttribute('width')
      const height = svg?.getAttribute('height')
      if (svg && width && height) {
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
        svg.removeAttribute('width')
        svg.removeAttribute('height')
      }
    })

    return () => {
      cancelled = true
      calInstanceRef.current?.destroy()
    }
    // `data`/`colorScale` are compared by JSON below since callers rebuild them each
    // render; `mode` re-runs the paint when the theme (and thus colorScale colors) flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), mode, range, domain, subDomainType, isCompact, JSON.stringify(colorScale), legendId, tooltipText, legendLabel, getFirstDayNumber])

  // A full year is far wider than a phone, so it keeps a fixed width and scrolls there,
  // stretching to fill the card from md up. A single week or month has few enough columns
  // to fill the card at every breakpoint, with no scroll container needed.
  return (
    <div
      className={cn(
        '[&_.ch-domain-text]:fill-text-secondary [&_.ch-domain-text]:text-xs [&_.ch-domain-text]:font-semibold [&_.ch-domain-text]:uppercase [&_.ch-plugin-legend-lite]:fill-text-secondary [&_.ch-subdomain-bg]:fill-surface',
        className
      )}
    >
      {isCompact ? (
        <div
          ref={containerRef}
          className="w-full [&_.ch-container]:w-full [&_svg]:h-auto [&_svg]:w-full"
        />
      ) : (
        <div className="-mx-8 overflow-x-auto px-8 pb-1 md:mx-0 md:px-0 md:pb-0">
          <div
            ref={containerRef}
            className="w-187.5 [&_.ch-container]:w-full [&_svg]:h-auto [&_svg]:w-187.5 md:w-full md:[&_svg]:w-full"
          />
        </div>
      )}
      <div id={legendId} ref={legendRef} className="mt-2 flex flex-wrap gap-2" />
    </div>
  )
}

export default CalendarHeatmap
