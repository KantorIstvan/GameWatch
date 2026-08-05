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
  /** First day of the first rendered month (only the year/month are used). */
  startDate: Date
  colorScale: CalendarHeatmapColorScale
  tooltipText: (timestamp: number, value: number | null) => string
  legendLabel: string
  /** Months rendered left to right, defaults to a full year. */
  range?: number
  className?: string
}

/**
 * GitHub-style calendar heatmap, shared by the Health and Statistics pages so the
 * cal-heatmap wiring (theming, tooltip/legend plugins, the SVG-viewBox swap that
 * stops the initial paint from visibly "popping" to full size) lives in one place
 * instead of being duplicated per page.
 */
function CalendarHeatmap({ data, startDate, colorScale, tooltipText, legendLabel, range = 12, className }: CalendarHeatmapProps) {
  const { mode } = useTheme()
  const { getFirstDayNumber } = useWeekStart()
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

    const points = Object.entries(data).map(([dateStr, value]) => {
      const [y, m, d] = dateStr.split('-').map(Number)
      return { date: Date.UTC(y, m - 1, d, 12, 0, 0), value }
    })

    const cal = new CalHeatmap()
    calInstanceRef.current = cal

    const paintStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1, 12, 0, 0)

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
        type: 'month',
        gutter: 6,
        label: {
          text: 'MMM',
          textAlign: 'start',
          position: 'top',
        },
      },
      subDomain: {
        type: 'day',
        radius: 3,
        width: 11,
        height: 11,
        gutter: 3,
      },
    }, [
      [Tooltip, { text: tooltipText }],
      [LegendLite, { itemSelector: `#${legendId}`, label: legendLabel }],
    ]).then(() => {
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
      calInstanceRef.current?.destroy()
    }
    // `data`/`colorScale` are compared by JSON below since callers rebuild them each
    // render; `mode` re-runs the paint when the theme (and thus colorScale colors) flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), startDate.getFullYear(), startDate.getMonth(), mode, range, JSON.stringify(colorScale), legendId, tooltipText, legendLabel, getFirstDayNumber])

  return (
    <div
      className={cn(
        '[&_.ch-domain-text]:fill-text-secondary [&_.ch-domain-text]:text-xs [&_.ch-domain-text]:font-semibold [&_.ch-domain-text]:uppercase [&_.ch-plugin-legend-lite]:fill-text-secondary [&_.ch-subdomain-bg]:fill-surface',
        className
      )}
    >
      <div className="-mx-8 overflow-x-auto px-8 pb-1 md:mx-0 md:px-0 md:pb-0">
        <div
          ref={containerRef}
          className="w-187.5 [&_.ch-container]:w-full [&_svg]:h-auto [&_svg]:w-187.5 md:w-full md:[&_svg]:w-full"
        />
      </div>
      <div id={legendId} ref={legendRef} className="mt-2 flex flex-wrap gap-2" />
    </div>
  )
}

export default CalendarHeatmap
