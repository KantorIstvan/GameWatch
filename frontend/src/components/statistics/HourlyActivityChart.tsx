import { Box, Paper, Typography, alpha, useTheme } from '@mui/material'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { useTimeFormat } from '../../contexts/TimeFormatContext'

interface HourlyData {
  hour: string
  hourNum: number
  hours: number
}

interface HourlyActivityChartProps {
  data: HourlyData[]
  title?: string
  height?: number
  noDataMessage?: string
}

function HourlyActivityChart({ 
  data, 
  title = 'Hourly Activity', 
  height = 350,
  noDataMessage = 'No hourly activity data available'
}: HourlyActivityChartProps) {
  const theme = useTheme()
  const { timeFormat } = useTimeFormat()

  const hasData = data.length > 0 && data.some(item => item.hours > 0)

  // Format hour labels based on time format preference
  const formatHourLabel = (hourNum: number): string => {
    if (timeFormat === '12h') {
      if (hourNum === 0) return '12AM'
      if (hourNum < 12) return `${hourNum}AM`
      if (hourNum === 12) return '12PM'
      return `${hourNum - 12}PM`
    }
    return hourNum.toString().padStart(2, '0')
  }

  // Prepare chart data with formatted labels
  const chartData = data.map(item => ({
    ...item,
    displayHour: formatHourLabel(item.hourNum),
    originalHour: item.hourNum
  }))

  // Get current hour for highlighting
  const currentHour = new Date().getHours()
  const primaryColor = theme.palette.primary.main
  const highlightColor = '#FF6B35'

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const isCurrentHour = data.originalHour === currentHour
      
      return (
        <Box
          sx={{
            backgroundColor: alpha(theme.palette.background.paper, 0.98),
            border: `1px solid ${alpha(isCurrentHour ? highlightColor : theme.palette.divider, 0.3)}`,
            borderRadius: 2,
            padding: 2,
            minWidth: 180,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              mb: 1,
              color: isCurrentHour ? highlightColor : theme.palette.text.primary,
            }}
          >
            {data.displayHour}
            {isCurrentHour && ' (Now)'}
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            Hours Played: <strong>{data.hours.toFixed(1)}h</strong>
          </Typography>
        </Box>
      )
    }
    return null
  }

  if (!hasData) {
    return (
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: alpha(theme.palette.background.paper, 0.6),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Typography variant="h6" gutterBottom fontWeight="bold">
          {title}
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            mt: 2,
            color: theme.palette.text.secondary,
            textAlign: 'center'
          }}
        >
          {noDataMessage}
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: { xs: 2, sm: 2.5, md: 3 }, 
        height: '100%',
        background: alpha(theme.palette.background.paper, 0.6),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}
    >
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
      
      <Box
        sx={{
          width: '100%',
          height: { xs: height - 50, sm: height },
          '& .recharts-cartesian-axis-tick-value': {
            fontSize: { xs: '0.6rem', sm: '0.7rem' },
            fontWeight: 500,
          },
          '& .recharts-label': {
            fontSize: { xs: '0.7rem', sm: '0.85rem' },
            fontWeight: 500,
          }
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData}
            margin={{ 
              top: 10, 
              right: window.innerWidth < 600 ? 5 : 20, 
              left: window.innerWidth < 600 ? -15 : 0, 
              bottom: window.innerWidth < 600 ? 50 : 20
            }}
          >
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.9}/>
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0.7}/>
              </linearGradient>
              <linearGradient id="barGradientHighlight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={highlightColor} stopOpacity={0.9}/>
                <stop offset="95%" stopColor={highlightColor} stopOpacity={0.7}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={alpha(theme.palette.divider, 0.3)}
              vertical={false}
            />
            
            <XAxis 
              dataKey="displayHour" 
              stroke={theme.palette.text.secondary}
              angle={window.innerWidth < 600 ? -45 : 0}
              textAnchor={window.innerWidth < 600 ? "end" : "middle"}
              height={window.innerWidth < 600 ? 70 : 50}
              interval={window.innerWidth < 600 ? 1 : 0}
              tick={(props: any) => {
                const { x, y, payload } = props
                const hourData = chartData.find(d => d.displayHour === payload.value)
                const isCurrentHour = hourData?.originalHour === currentHour
                
                return (
                  <text
                    x={x}
                    y={y}
                    textAnchor={window.innerWidth < 600 ? "end" : "middle"}
                    fill={isCurrentHour ? highlightColor : theme.palette.text.secondary}
                    fontSize={window.innerWidth < 600 ? 9 : 11}
                    fontWeight={isCurrentHour ? 700 : 500}
                    transform={window.innerWidth < 600 ? `rotate(-45, ${x}, ${y})` : undefined}
                  >
                    {payload.value}
                  </text>
                )
              }}
            />
            
            <YAxis 
              label={window.innerWidth >= 600 ? { 
                value: 'Hours Played', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: theme.palette.text.secondary, fontSize: 12 }
              } : undefined}
              stroke={theme.palette.text.secondary}
              width={window.innerWidth < 600 ? 35 : 60}
            />
            
            <Tooltip content={<CustomTooltip />} cursor={{ fill: alpha(primaryColor, 0.05) }} />
            
            <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={window.innerWidth < 600 ? 20 : 35}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.originalHour === currentHour ? 'url(#barGradientHighlight)' : 'url(#barGradient)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  )
}

export default HourlyActivityChart
