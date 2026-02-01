import { Box, Typography, useTheme } from '@mui/material'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { alpha } from '@mui/material'
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
  noDataMessage?: string
  showLegend?: boolean
  isHourlyChart?: boolean
  highlightCurrentHour?: boolean
}

function ReusableBarChart({ 
  data, 
  title, 
  xAxisKey,
  yAxisLabel,
  bars,
  height = 300,
  noDataMessage = 'No data available',
  showLegend = false,
  isHourlyChart = false,
  highlightCurrentHour = false
}: ReusableBarChartProps) {
  const theme = useTheme()
  const { timeFormat } = useTimeFormat()
  
  const hasData = data.length > 0 && data.some(item => 
    bars.some(bar => (item[bar.dataKey] as number) > 0)
  )

  // Format hour labels based on time format preference
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

  // Prepare chart data with formatted labels for hourly charts
  const chartData = isHourlyChart ? data.map(item => ({
    ...item,
    hour: formatHourLabel(item.hourNum as number),
    hourNum: item.hourNum
  })) : data

  // Get current hour for highlighting
  const currentHour = new Date().getHours()
  const highlightColor = '#FF6B35'

  return (
    <>
      <Typography 
        variant="h6" 
        gutterBottom 
        fontWeight="bold"
        sx={{
          fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
        }}
      >
        {title}
      </Typography>
      {hasData ? (
        <Box
          sx={{
            width: '100%',
            height,
            '& .recharts-cartesian-axis-tick-value': {
              fontSize: { xs: '0.65rem', sm: '0.75rem' }
            },
            '& .recharts-label': {
              fontSize: { xs: '0.7rem', sm: '0.75rem' }
            }
          }}
        >
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
              <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
              <XAxis 
                dataKey={xAxisKey}
                stroke={theme.palette.text.secondary}
                tick={{ fontSize: window.innerWidth < 600 ? 9 : 12 }}
                interval={window.innerWidth < 600 ? 2 : 0}
              />
              <YAxis 
                label={window.innerWidth >= 600 && yAxisLabel ? { 
                  value: yAxisLabel, 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: theme.palette.text.secondary }
                } : undefined}
                stroke={theme.palette.text.secondary}
                tick={{ fontSize: window.innerWidth < 600 ? 10 : 12 }}
                width={window.innerWidth < 600 ? 35 : 60}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                }}
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
        </Box>
      ) : (
        <Box
          sx={{
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2">{noDataMessage}</Typography>
        </Box>
      )}
    </>
  )
}

export default ReusableBarChart
