import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

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
  noDataMessage?: string
}

function ReusablePieChart({
  data,
  title,
  height = 300,
  noDataMessage = 'No data available'
}: ReusablePieChartProps) {
  const hasData = data.length > 0 && data.some(item => item.value > 0)
  const filteredData = data.filter(item => item.value > 0)

  const tooltipContent = (value: any, name: string | undefined, props: any) => {
    const displayName = props?.payload?.fullName || name || ''
    return [`${Number(value).toFixed(1)}h`, displayName]
  }

  return (
    <>
      <p className="mb-2 text-body-sm font-bold sm:text-body-lg">{title}</p>
      {hasData ? (
        <div className="flex w-full flex-col items-center gap-4 md:flex-row md:gap-6">
          <div className="flex h-62.5 w-full items-center justify-center sm:h-70 md:h-75 md:w-3/5">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filteredData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius="70%"
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
          <div className="flex w-full flex-col justify-center gap-2 md:w-2/5 md:gap-3">
            {filteredData.map((entry, index) => (
              <div key={`legend-${index}`} className="flex items-center gap-3">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.fill }}
                />
                <span className="text-body-sm leading-tight text-text-primary">
                  {entry.fullName || entry.name}
                </span>
              </div>
            ))}
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
