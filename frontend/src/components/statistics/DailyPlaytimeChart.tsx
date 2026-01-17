import { Box, Typography, Paper, alpha, useTheme } from '@mui/material'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DailyPlaytimeChartProps {
  data: Array<{ date: string; hours: number }>
  title: string
}

function DailyPlaytimeChart({ data, title }: DailyPlaytimeChartProps) {
  const theme = useTheme()

  if (data.length === 0) return null

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
          height: { xs: 280, sm: 300 },
          '& .recharts-cartesian-axis-tick-value': {
            fontSize: { xs: '0.65rem', sm: '0.75rem' }
          },
          '& .recharts-label': {
            fontSize: { xs: '0.7rem', sm: '0.75rem' }
          }
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
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
                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={theme.palette.mode === 'dark' ? 0.15 : 0.08}/>
                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
            <XAxis 
              dataKey="date" 
              stroke={theme.palette.text.secondary}
              tick={{ fontSize: window.innerWidth < 600 ? 10 : 12 }}
              angle={-45}
              textAnchor="end"
              height={window.innerWidth < 600 ? 55 : 60}
              interval={window.innerWidth < 600 ? 'preserveStartEnd' : 0}
            />
            <YAxis 
              label={window.innerWidth >= 600 ? { 
                value: 'Hours', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: theme.palette.text.secondary, fontSize: 12 }
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
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="hours"
              stroke={theme.palette.primary.main}
              strokeWidth={2}
              fill="url(#colorHours)"
              name="Hours Played"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  )
}

export default DailyPlaytimeChart
