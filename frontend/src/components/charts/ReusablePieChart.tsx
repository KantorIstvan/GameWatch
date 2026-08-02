import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

interface PieChartData {
  name: string
  value: number
  fill: string
  fullName?: string
  [key: string]: any
}

interface ReusablePieChartProps {
  data: PieChartData[]
  title: string
  minLabelPercent?: number
  showLabel?: boolean
  height?: number
  noDataMessage: string
  valueFormatter?: (hours: number) => string
  /** Use for cards spanning extra grid width — grows the chart and lets the legend wrap into columns instead of leaving empty space. */
  wide?: boolean
}

function ReusablePieChart({
  data,
  title,
  height = 300,
  noDataMessage,
  valueFormatter,
  wide = false
}: ReusablePieChartProps) {
  const hasData = data.length > 0 && data.some(item => item.value > 0)
  const filteredData = data.filter(item => item.value > 0)
  const total = filteredData.reduce((sum, item) => sum + item.value, 0)

  const tooltipContent = (value: any, name: string | undefined, props: any) => {
    const displayName = props?.payload?.fullName || name || ''
    const formattedValue = valueFormatter ? valueFormatter(Number(value)) : `${Number(value).toFixed(1)}h`
    return [formattedValue, displayName]
  }

  return (
    <>
      <p className="mb-2 text-body-sm font-bold sm:text-body-lg">{title}</p>
      {hasData ? (
        <div className={cn('flex w-full flex-col items-center gap-4 md:flex-row md:gap-6', wide && 'lg:gap-10')}>
          <div
            className={cn(
              'flex w-full items-center justify-center md:w-3/5',
              wide ? 'h-70 sm:h-80 md:h-90' : 'h-62.5 sm:h-70 md:h-75'
            )}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filteredData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={wide ? '80%' : '70%'}
                  innerRadius="0%"
                  fill="#8884d8"
                  dataKey="value"
                >
                  {filteredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={tooltipContent}
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    color: 'var(--color-text-primary)',
                  }}
                  labelStyle={{ color: 'var(--color-text-primary)' }}
                  itemStyle={{ color: 'var(--color-text-primary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div
            className={cn(
              'grid w-full gap-x-6 gap-y-2 self-center md:w-2/5 md:gap-y-3',
              wide && filteredData.length > 4 ? 'sm:grid-cols-2' : 'grid-cols-1'
            )}
          >
            {filteredData.map((entry, index) => {
              const percent = total > 0 ? (entry.value / total) * 100 : 0
              return (
                <div key={`legend-${index}`} className="flex items-center gap-3">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.fill }}
                  />
                  <span className="text-body-sm leading-tight text-text-primary">
                    {entry.fullName || entry.name}
                    <span className="ml-1.5 text-text-secondary">{percent.toFixed(0)}%</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ height }} className="flex items-center justify-center text-text-secondary">
          <p className="text-body-sm">{noDataMessage}</p>
        </div>
      )}
    </>
  )
}

export default ReusablePieChart
