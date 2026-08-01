import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { useTranslation } from 'react-i18next'
import { useWeekStart } from '../../contexts/WeekStartContext'
import { formatDurationWords } from '../../utils/formatters'

interface DayOfWeekData {
  day: string
  hours: number
  avgHours: number
}

interface DayOfWeekDualAxisChartProps {
  data: DayOfWeekData[]
  height?: number
  noDataMessage?: string
}

const normalPrimary = 'var(--color-accent)'
const normalPrimaryLight = 'var(--color-accent-hover)'
const normalSecondary = 'var(--color-text-tertiary)'
const vibrantPrimary = '#FF6B35'
const vibrantPrimaryLight = '#FF8A5C'
const vibrantSecondary = '#F7931E'

function DayOfWeekDualAxisChart({
  data,
  height = 400,
  noDataMessage = 'No data available'
}: DayOfWeekDualAxisChartProps) {
  const { weekStart } = useWeekStart()
  const { t } = useTranslation()

  const hasData = data.length > 0 && data.some(item => item.hours > 0 || item.avgHours > 0)

  const currentDayIndex = new Date().getDay()
  const currentDayMappedIndex = weekStart === 'SUNDAY'
    ? currentDayIndex
    : (currentDayIndex === 0 ? 6 : currentDayIndex - 1)

  const chartData = data.map((item, index) => ({
    ...item,
    barColor: index === currentDayMappedIndex ? vibrantPrimary : normalPrimary,
    barGradientId: index === currentDayMappedIndex ? 'gradientCurrent' : 'gradientNormal',
    lineColor: index === currentDayMappedIndex ? vibrantSecondary : normalSecondary,
  }))

  const formatDuration = (hours: number) => formatDurationWords(Math.round(hours * 3600), t)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isCurrentDay = data.findIndex(item => item.day === label) === currentDayMappedIndex

      return (
        <div
          className="min-w-40 rounded-xl border p-4 sm:min-w-55"
          style={{
            backgroundColor: 'var(--color-surface-raised)',
            borderColor: isCurrentDay ? `${vibrantPrimary}4d` : 'var(--color-border)',
          }}
        >
          <p
            className="mb-2 flex items-center gap-1 text-caption font-bold sm:mb-3 sm:text-body-sm"
            style={{ color: isCurrentDay ? vibrantPrimary : 'var(--color-text-primary)' }}
          >
            {label}
            {isCurrentDay && (
              <span
                className="inline-flex size-4 items-center justify-center rounded-full text-[0.65rem] font-bold sm:size-5 sm:text-caption"
                style={{ backgroundColor: `${vibrantPrimary}1a`, color: vibrantPrimary }}
              >
                ●
              </span>
            )}
          </p>
          <div className="flex flex-col gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="h-3 w-3 shrink-0 rounded-sm sm:h-4 sm:w-5" style={{
                background: isCurrentDay
                  ? `linear-gradient(135deg, ${vibrantPrimary} 0%, ${vibrantPrimaryLight} 100%)`
                  : `linear-gradient(135deg, ${normalPrimary} 0%, ${normalPrimaryLight} 100%)`,
              }} />
              <span className="text-caption text-text-secondary sm:text-body-sm">
                Total: <strong className="font-semibold text-text-primary">{formatDuration(payload[0]?.value || 0)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span
                className="h-0.75 w-3 shrink-0 rounded-full sm:w-5"
                style={{ backgroundColor: isCurrentDay ? vibrantSecondary : normalSecondary }}
              />
              <span className="text-caption text-text-secondary sm:text-body-sm">
                Avg: <strong className="font-semibold text-text-primary">{formatDuration(payload[1]?.value || 0)}</strong>
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const CustomLegend = (props: any) => {
    const { payload } = props
    return (
      <div className="flex flex-wrap items-center justify-center gap-4 pb-2 sm:gap-8">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-1.5 sm:gap-2">
            {entry.dataKey === 'hours' ? (
              <span
                className="h-3 w-4 shrink-0 rounded-sm sm:h-3.5 sm:w-5"
                style={{ background: `linear-gradient(135deg, ${normalPrimary} 0%, ${normalPrimaryLight} 100%)` }}
              />
            ) : (
              <span className="h-0.75 w-4 shrink-0 rounded-full sm:w-5" style={{ backgroundColor: normalSecondary }} />
            )}
            <span className="whitespace-nowrap text-[0.7rem] font-medium text-text-secondary sm:text-body-sm">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {hasData ? (
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{
                top: 10,
                right: window.innerWidth < 600 ? 15 : 45,
                left: window.innerWidth < 600 ? 0 : 25,
                bottom: window.innerWidth < 600 ? 10 : 20
              }}
            >
              <defs>
                <linearGradient id="gradientCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={vibrantPrimary} stopOpacity={1} />
                  <stop offset="100%" stopColor={vibrantPrimaryLight} stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id="gradientNormal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={normalPrimary} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={normalPrimaryLight} stopOpacity={0.7} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />

              <XAxis
                dataKey="day"
                stroke="var(--color-text-secondary)"
                tick={(props: any) => {
                  const { x, y, payload } = props
                  const index = chartData.findIndex(item => item.day === payload.value)
                  const isCurrentDay = index === currentDayMappedIndex
                  const isMobile = window.innerWidth < 600

                  const displayValue = isMobile ? payload.value.substring(0, 3) : payload.value

                  return (
                    <text
                      x={x}
                      y={y + 10}
                      textAnchor="middle"
                      fill={isCurrentDay ? vibrantPrimary : 'var(--color-text-secondary)'}
                      fontSize={isMobile ? 10 : 13}
                      fontWeight={isCurrentDay ? 700 : 500}
                    >
                      {displayValue}
                      {isCurrentDay && (
                        <tspan fontSize={isMobile ? 8 : 12} dy={-1}>●</tspan>
                      )}
                    </text>
                  )
                }}
                interval={0}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
              />

              <YAxis
                yAxisId="left"
                orientation="left"
                stroke={normalPrimary}
                tick={{
                  fontSize: window.innerWidth < 600 ? 10 : 13,
                  fill: 'var(--color-text-secondary)',
                  fontWeight: 500,
                }}
                width={window.innerWidth < 600 ? 40 : 65}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
              />

              <YAxis
                yAxisId="right"
                orientation="right"
                stroke={normalSecondary}
                tick={{
                  fontSize: window.innerWidth < 600 ? 10 : 13,
                  fill: 'var(--color-text-secondary)',
                  fontWeight: 500,
                }}
                width={window.innerWidth < 600 ? 40 : 65}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-accent-subtle)' }} />

              <Legend content={<CustomLegend />} />

              <Bar
                yAxisId="left"
                dataKey="hours"
                name="Total Hours"
                radius={[6, 6, 0, 0]}
                maxBarSize={window.innerWidth < 600 ? 40 : 60}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#${entry.barGradientId})`}
                  />
                ))}
              </Bar>

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgHours"
                stroke={normalSecondary}
                strokeWidth={window.innerWidth < 600 ? 2.5 : 3}
                name="Avg Session"
                dot={(dotProps: any) => {
                  const isCurrentDay = dotProps.index === currentDayMappedIndex
                  const isMobile = window.innerWidth < 600
                  return (
                    <circle
                      cx={dotProps.cx}
                      cy={dotProps.cy}
                      r={isCurrentDay ? (isMobile ? 5 : 7) : (isMobile ? 4 : 5)}
                      fill={isCurrentDay ? vibrantSecondary : normalSecondary}
                      stroke="var(--color-surface-raised)"
                      strokeWidth={isMobile ? 2 : 2.5}
                    />
                  )
                }}
                activeDot={(dotProps: any) => {
                  const isMobile = window.innerWidth < 600
                  return (
                    <circle
                      cx={dotProps.cx}
                      cy={dotProps.cy}
                      r={isMobile ? 7 : 9}
                      fill={vibrantSecondary}
                      stroke="var(--color-surface-raised)"
                      strokeWidth={isMobile ? 2.5 : 3}
                    />
                  )
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div
          style={{ height }}
          className="flex items-center justify-center rounded-xl border border-dashed border-border bg-border/5 px-4 text-center text-text-secondary"
        >
          <p className="text-body-sm font-medium">{noDataMessage}</p>
        </div>
      )}
    </>
  )
}

export default DayOfWeekDualAxisChart
