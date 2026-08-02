import { useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TimePickerClockProps {
  hour24: number
  minute: number
  is12h: boolean
  onChange: (hour24: number, minute: number) => void
  className?: string
}

type ClockMode = 'hour' | 'minute'
type ClockRing = 'outer' | 'inner'

const SIZE = 280
const CENTER = SIZE / 2
const OUTER_RADIUS = 108
const INNER_RADIUS = 66
const NUMBER_HIT_RADIUS = 20
const NUMBER_VISUAL_RADIUS = 16

function pointForSlot(slot: number, radius: number) {
  const angleDeg = slot * 30 - 90
  const angleRad = (angleDeg * Math.PI) / 180
  return { x: CENTER + radius * Math.cos(angleRad), y: CENTER + radius * Math.sin(angleRad) }
}

function pointForMinute(minuteValue: number, radius: number) {
  const angleDeg = (minuteValue / 60) * 360 - 90
  const angleRad = (angleDeg * Math.PI) / 180
  return { x: CENTER + radius * Math.cos(angleRad), y: CENTER + radius * Math.sin(angleRad) }
}

function angleAndDistanceFromClick(svg: SVGSVGElement, clientX: number, clientY: number) {
  const rect = svg.getBoundingClientRect()
  const x = ((clientX - rect.left) / rect.width) * SIZE
  const y = ((clientY - rect.top) / rect.height) * SIZE
  const dx = x - CENTER
  const dy = y - CENTER
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90
  if (deg < 0) deg += 360
  return { deg, distance: Math.hypot(dx, dy) }
}

/** Resolves a clicked ring slot (0 = the "12"/"00" position, clockwise) into a 0-23 hour. */
function hourFromSlot(slot: number, ring: ClockRing, is12h: boolean, currentPeriod: 'AM' | 'PM'): number {
  const twelveBased = slot === 0 ? 12 : slot
  if (is12h) {
    return currentPeriod === 'PM' ? (twelveBased % 12) + 12 : twelveBased % 12
  }
  return ring === 'outer' ? twelveBased : (twelveBased === 12 ? 0 : twelveBased + 12)
}

export function TimePickerClock({ hour24, minute, is12h, onChange, className }: TimePickerClockProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<ClockMode>('hour')

  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = ((hour24 + 11) % 12) + 1

  const commitHour = (h: number) => {
    onChange(h, minute)
    setMode('minute')
  }

  const commitMinute = (m: number) => {
    onChange(hour24, m)
  }

  const togglePeriod = (next: 'AM' | 'PM') => {
    if (next === period) return
    onChange((hour24 + 12) % 24, minute)
  }

  let selectedSlot: number
  let selectedRing: ClockRing = 'outer'
  if (is12h) {
    selectedSlot = hour12 % 12
  } else if (hour24 === 0) {
    selectedSlot = 0
    selectedRing = 'inner'
  } else if (hour24 <= 12) {
    selectedSlot = hour24 % 12
  } else {
    selectedSlot = (hour24 - 12) % 12
    selectedRing = 'inner'
  }

  const handPoint =
    mode === 'hour'
      ? pointForSlot(selectedSlot, selectedRing === 'inner' ? INNER_RADIUS : OUTER_RADIUS)
      : pointForMinute(minute, OUTER_RADIUS)

  const handleDialClick = (e: ReactMouseEvent<SVGSVGElement>) => {
    const { deg, distance } = angleAndDistanceFromClick(e.currentTarget, e.clientX, e.clientY)

    if (mode === 'minute') {
      commitMinute(Math.round(deg / 6) % 60)
      return
    }

    const slot = Math.round(deg / 30) % 12
    const ring: ClockRing = !is12h && distance < (OUTER_RADIUS + INNER_RADIUS) / 2 ? 'inner' : 'outer'
    commitHour(hourFromSlot(slot, ring, is12h, period))
  }

  const renderNumberGroup = (
    key: string,
    x: number,
    y: number,
    label: string,
    isSelected: boolean,
    onSelect: () => void,
    small = false
  ) => {
    const activate = (e: ReactMouseEvent | ReactKeyboardEvent) => {
      e.stopPropagation()
      onSelect()
    }

    return (
      <g
        key={key}
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-pressed={isSelected}
        onClick={activate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            activate(e)
          }
        }}
        className="group cursor-pointer outline-none"
      >
        {isSelected && <circle cx={x} cy={y} r={NUMBER_VISUAL_RADIUS} className="fill-accent" />}
        <circle cx={x} cy={y} r={NUMBER_HIT_RADIUS} className="fill-transparent" />
        <circle
          cx={x}
          cy={y}
          r={NUMBER_HIT_RADIUS}
          strokeWidth={2}
          className="fill-transparent stroke-accent opacity-0 transition-opacity duration-150 ease-standard group-focus-visible:opacity-100"
        />
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          className={cn(
            'pointer-events-none select-none font-medium',
            small ? 'text-caption' : 'text-body-sm',
            isSelected ? 'fill-accent-foreground' : small ? 'fill-text-secondary' : 'fill-text-primary'
          )}
        >
          {label}
        </text>
      </g>
    )
  }

  const renderHourNumbers = () => {
    const outer = Array.from({ length: 12 }, (_, slot) => {
      const value = slot === 0 ? 12 : slot
      const { x, y } = pointForSlot(slot, OUTER_RADIUS)
      const isSelected = mode === 'hour' && selectedRing === 'outer' && selectedSlot === slot
      return renderNumberGroup(`outer-${value}`, x, y, String(value), isSelected, () =>
        commitHour(hourFromSlot(slot, 'outer', is12h, period))
      )
    })

    if (is12h) return outer

    const inner = Array.from({ length: 12 }, (_, slot) => {
      const value = slot === 0 ? 0 : slot + 12
      const { x, y } = pointForSlot(slot, INNER_RADIUS)
      const isSelected = mode === 'hour' && selectedRing === 'inner' && selectedSlot === slot
      return renderNumberGroup(
        `inner-${value}`,
        x,
        y,
        value.toString().padStart(2, '0'),
        isSelected,
        () => commitHour(hourFromSlot(slot, 'inner', is12h, period)),
        true
      )
    })

    return [...outer, ...inner]
  }

  const renderMinuteNumbers = () =>
    Array.from({ length: 12 }, (_, slot) => {
      const value = slot * 5
      const { x, y } = pointForSlot(slot, OUTER_RADIUS)
      const isSelected = mode === 'minute' && minute === value
      return renderNumberGroup(`minute-${value}`, x, y, value.toString().padStart(2, '0'), isSelected, () =>
        commitMinute(value)
      )
    })

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          aria-pressed={mode === 'hour'}
          onClick={() => setMode('hour')}
          className={cn(
            'h-auto px-3 py-1.5 text-h2 font-semibold',
            mode === 'hour' ? 'bg-accent-subtle text-accent hover:bg-accent-subtle' : 'text-text-primary'
          )}
        >
          {(is12h ? hour12 : hour24).toString().padStart(is12h ? 1 : 2, '0')}
        </Button>
        <span className="text-h2 font-semibold text-text-secondary">:</span>
        <Button
          type="button"
          variant="ghost"
          aria-pressed={mode === 'minute'}
          onClick={() => setMode('minute')}
          className={cn(
            'h-auto px-3 py-1.5 text-h2 font-semibold',
            mode === 'minute' ? 'bg-accent-subtle text-accent hover:bg-accent-subtle' : 'text-text-primary'
          )}
        >
          {minute.toString().padStart(2, '0')}
        </Button>

        {is12h && (
          <div className="ml-2 flex flex-col overflow-hidden rounded-md border border-border">
            <Button
              type="button"
              variant="ghost"
              aria-pressed={period === 'AM'}
              onClick={() => togglePeriod('AM')}
              className={cn(
                'h-auto rounded-none px-2 py-1 text-caption font-semibold',
                period === 'AM' ? 'bg-accent text-accent-foreground hover:bg-accent' : 'text-text-secondary'
              )}
            >
              {t('timePicker.am')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              aria-pressed={period === 'PM'}
              onClick={() => togglePeriod('PM')}
              className={cn(
                'h-auto rounded-none px-2 py-1 text-caption font-semibold',
                period === 'PM' ? 'bg-accent text-accent-foreground hover:bg-accent' : 'text-text-secondary'
              )}
            >
              {t('timePicker.pm')}
            </Button>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-70 w-70 touch-none select-none"
        onClick={handleDialClick}
        role="group"
        aria-label={mode === 'hour' ? t('timePicker.selectHour') : t('timePicker.selectMinute')}
      >
        <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + NUMBER_VISUAL_RADIUS} className="fill-surface" />
        <circle cx={CENTER} cy={CENTER} r={3} className="fill-accent" />
        <line x1={CENTER} y1={CENTER} x2={handPoint.x} y2={handPoint.y} strokeWidth={2} className="stroke-accent" />
        <circle cx={handPoint.x} cy={handPoint.y} r={4} className="fill-accent" />
        {mode === 'hour' ? renderHourNumbers() : renderMinuteNumbers()}
      </svg>
    </div>
  )
}

export default TimePickerClock
