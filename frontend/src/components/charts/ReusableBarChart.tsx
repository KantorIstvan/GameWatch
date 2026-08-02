import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { useTimeFormat } from '../../contexts/TimeFormatContext'

interface BarChartData {
  [key: string]: string | number
}

interface BarConfig {
  dataKey: string
  fill: string
  name: string
}

interface ReusableBarChartProps {
  data: BarChartData[]
  title: string
  xAxisKey: string
  yAxisLabel?: string
  bars: BarConfig[]
  height?: number
  noDataMessage: string
  showLegend?: boolean
  isHourlyChart?: boolean
  highlightCurrentHour?: boolean
  valueFormatter?: (value: number) => string
}

function ReusableBarChart({
  data,
  title,
  xAxisKey,
  yAxisLabel,
  bars,
  height = 300,
  noDataMessage,
  showLegend = false,
  isHourlyChart = false,
  highlightCurrentHour = false,
  valueFormatter
}: ReusableBarChartProps) {
  const { timeFormat } = useTimeFormat()

  const hasData = data.length > 0 && data.some(item =>
    bars.some(bar => (item[bar.dataKey] as number) > 0)
  )

  const formatHourLabel = (hourNum: number): string => {
    if (!isHourlyChart) return hourNum.toString()

    if (timeFormat === '12h') {
      if (hourNum === 0) return '12AM'
      if (hourNum < 12) return `${hourNum}AM`
      if (hourNum === 12) return '12PM'
      return `${hourNum - 12}PM`
    }
    return `${hourNum.toString().padStart(2, '0')}:00`
  }

  const chartData = isHourlyChart ? data.map(item => ({
    ...item,
    hour: formatHourLabel(item.hourNum as number),
    hourNum: item.hourNum
  })) : data

  const currentHour = new Date().getHours()
  const highlightColor = 'var(--color-accent)'

  return (
    <>
      <p className="mb-2 text-body-sm font-bold sm:text-body-lg">{title}</p>
      {hasData ? (
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={chartData}
              margin={{
                top: 10,
                right: window.innerWidth < 600 ? 5 : 30,
                left: window.innerWidth < 600 ? -20 : 0,
                bottom: 0
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey={xAxisKey}
                stroke="var(--color-text-secondary)"
                tick={isHourlyChart && highlightCurrentHour ? (props: any) => {
                  const { x, y, payload } = props
                  const hourData = chartData.find((d: any) => d[xAxisKey] === payload.value)
                  const isCurrentHour = hourData?.hourNum === currentHour

                  return (
                    <text
                      x={x}
                      y={y + 10}
                      textAnchor="middle"
                      fill={isCurrentHour ? highlightColor : 'var(--color-text-secondary)'}
                      fontSize={window.innerWidth < 600 ? 9 : 12}
                      fontWeight={isCurrentHour ? 700 : 500}
                    >
                      {payload.value}
                    </text>
                  )
                } : { fontSize: window.innerWidth < 600 ? 9 : 12 }}
                interval={window.innerWidth < 600 ? 2 : 0}
              />
              <YAxis
                label={window.innerWidth >= 600 && yAxisLabel ? {
                  value: yAxisLabel,
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: 'var(--color-text-secondary)' }
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
              {showLegend && <Legend />}
              {bars.map((bar, index) => (
                <Bar
                  key={index}
                  dataKey={bar.dataKey}
                  fill={bar.fill}
                  name={bar.name}
                  radius={[8, 8, 0, 0]}
                >
                  {isHourlyChart && highlightCurrentHour && chartData.map((entry: any, idx: number) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={entry.hourNum === currentHour ? highlightColor : bar.fill}
                    />
                  ))}
                </Bar>
              ))}
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ height }} className="flex items-center justify-center text-text-secondary">
          <p className="text-body-sm">{noDataMessage}</p>
        </div>
      )}
    </>
  )
}

export default ReusableBarChart
