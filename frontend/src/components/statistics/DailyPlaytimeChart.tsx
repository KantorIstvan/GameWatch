import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DailyPlaytimeChartProps {
  data: Array<{ date: string; hours: number; rollingHours?: number | null }>
  title: string
  yAxisLabel: string
  seriesName: string
  trendSeriesName: string
  valueFormatter?: (hours: number) => string
}

function DailyPlaytimeChart({ data, title, yAxisLabel, seriesName, trendSeriesName, valueFormatter }: DailyPlaytimeChartProps) {
  if (data.length === 0) return null

  // Thin out date labels as the range grows so they never overlap, instead of
  // rendering one tick per day regardless of how many days are in view.
  const targetTickCount = window.innerWidth < 600 ? 6 : 12
  const tickInterval = data.length > targetTickCount
    ? Math.ceil(data.length / targetTickCount) - 1
    : 0

  return (
    <div className="h-full rounded-xl border border-border bg-surface/60 p-4 backdrop-blur-xl sm:p-5 md:p-6">
      <p className="mb-2 text-body-sm font-bold sm:text-body-lg">{title}</p>
      <div className="h-70 w-full sm:h-75">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{
              top: 10,
              right: window.innerWidth < 600 ? 5 : 30,
              left: window.innerWidth < 600 ? -20 : 0,
              bottom: window.innerWidth < 600 ? 35 : 0
            }}
          >
            <defs>
              <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              stroke="var(--color-text-secondary)"
              tick={{ fontSize: window.innerWidth < 600 ? 10 : 12 }}
              angle={-45}
              textAnchor="end"
              height={window.innerWidth < 600 ? 55 : 60}
              interval={tickInterval}
            />
            <YAxis
              label={window.innerWidth >= 600 ? {
                value: yAxisLabel,
                angle: -90,
                position: 'insideLeft',
                style: { fill: 'var(--color-text-secondary)', fontSize: 12 }
              } : undefined}
              stroke="var(--color-text-secondary)"
              tick={{ fontSize: window.innerWidth < 600 ? 10 : 12 }}
              width={window.innerWidth < 600 ? 35 : 60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
              }}
              formatter={valueFormatter ? (value: number | undefined, name: string | undefined) => [valueFormatter(value || 0), name || ''] : undefined}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="hours"
              stroke="var(--color-accent)"
              strokeWidth={2}
              fill="url(#colorHours)"
              name={seriesName}
            />
            {/* Trailing seven-day mean. Daily play is spiky enough that the area alone
                says very little about which way things are heading. */}
            <Line
              type="monotone"
              dataKey="rollingHours"
              stroke="var(--color-text-secondary)"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
              activeDot={false}
              name={trendSeriesName}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default DailyPlaytimeChart
