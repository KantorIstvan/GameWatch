import { Box, Typography, useTheme } from '@mui/material'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { alpha } from '@mui/material'

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
}

function ReusableBarChart({ 
  data, 
  title, 
  xAxisKey,
  yAxisLabel,
  bars,
  height = 300,
  noDataMessage = 'No data available',
  showLegend = false
}: ReusableBarChartProps) {
  const theme = useTheme()
  
  const hasData = data.length > 0 && data.some(item => 
    bars.some(bar => (item[bar.dataKey] as number) > 0)
  )

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
              data={data}
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
                />
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
