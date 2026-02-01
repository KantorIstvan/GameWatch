import { Box, Typography, useTheme } from '@mui/material'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { alpha } from '@mui/material'
import { useWeekStart } from '../../contexts/WeekStartContext'

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

function DayOfWeekDualAxisChart({
  data,
  height = 400,
  noDataMessage = 'No data available'
}: DayOfWeekDualAxisChartProps) {
  const theme = useTheme()
  const { weekStart } = useWeekStart()

  const hasData = data.length > 0 && data.some(item => item.hours > 0 || item.avgHours > 0)

  // Get current day of week (0 = Sunday, 1 = Monday, etc.)
  const currentDayIndex = new Date().getDay()
  // Convert to match our data order based on weekStart setting
  // If weekStart is MONDAY: Monday = 0, Sunday = 6
  // If weekStart is SUNDAY: Sunday = 0, Monday = 1
  const currentDayMappedIndex = weekStart === 'SUNDAY' 
    ? currentDayIndex 
    : (currentDayIndex === 0 ? 6 : currentDayIndex - 1)

  // Enhanced color palette with gradients
  const vibrantPrimary = '#FF6B35'
  const vibrantPrimaryLight = '#FF8A5C'
  const vibrantSecondary = '#F7931E'
  //const vibrantSecondaryLight = '#FFAD47'
  const normalPrimary = theme.palette.primary.main
  const normalPrimaryLight = theme.palette.primary.light
  const normalSecondary = theme.palette.secondary.main

  // Prepare data with enhanced colors
  const chartData = data.map((item, index) => ({
    ...item,
    barColor: index === currentDayMappedIndex ? vibrantPrimary : normalPrimary,
    barGradientId: index === currentDayMappedIndex ? 'gradientCurrent' : 'gradientNormal',
    lineColor: index === currentDayMappedIndex ? vibrantSecondary : normalSecondary,
  }))

  const formatDuration = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}min`
    }
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}min` : `${h}h`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isCurrentDay = data.findIndex(item => item.day === label) === currentDayMappedIndex

      return (
        <Box
          sx={{
            backgroundColor: alpha(theme.palette.background.paper, 0.98),
            border: `1px solid ${alpha(isCurrentDay ? vibrantPrimary : theme.palette.divider, 0.3)}`,
            borderRadius: { xs: 2, sm: 3 },
            padding: { xs: 1.5, sm: 2.5 },
            minWidth: { xs: 160, sm: 220 },
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              color: isCurrentDay ? vibrantPrimary : theme.palette.text.primary,
              mb: { xs: 1, sm: 1.5 },
              fontSize: { xs: '0.8rem', sm: '0.95rem' },
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            {label}
            {isCurrentDay && (
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: { xs: 16, sm: 20 },
                  height: { xs: 16, sm: 20 },
                  borderRadius: '50%',
                  backgroundColor: alpha(vibrantPrimary, 0.1),
                  color: vibrantPrimary,
                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                  fontWeight: 700,
                }}
              >
                ●
              </Box>
            )}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.75, sm: 1.25 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
              <Box
                sx={{
                  width: { xs: 12, sm: 16 },
                  height: { xs: 12, sm: 16 },
                  background: isCurrentDay 
                    ? `linear-gradient(135deg, ${vibrantPrimary} 0%, ${vibrantPrimaryLight} 100%)`
                    : `linear-gradient(135deg, ${normalPrimary} 0%, ${normalPrimaryLight} 100%)`,
                  borderRadius: 1.5,
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, color: theme.palette.text.secondary }}>
                Total: <Box component="strong" sx={{ color: theme.palette.text.primary, fontWeight: 600 }}>{payload[0]?.value?.toFixed(1)}h</Box>
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
              <Box
                sx={{
                  width: { xs: 12, sm: 16 },
                  height: { xs: 2.5, sm: 3 },
                  backgroundColor: isCurrentDay ? vibrantSecondary : normalSecondary,
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, color: theme.palette.text.secondary }}>
                Avg: <Box component="strong" sx={{ color: theme.palette.text.primary, fontWeight: 600 }}>{formatDuration(payload[1]?.value || 0)}</Box>
              </Typography>
            </Box>
          </Box>
        </Box>
      )
    }
    return null
  }

  const CustomLegend = (props: any) => {
    const { payload } = props
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: { xs: 2, sm: 4 },
          pb: { xs: 1, sm: 2 },
          flexWrap: 'wrap',
        }}
      >
        {payload.map((entry: any, index: number) => (
          <Box
            key={`legend-${index}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.75, sm: 1 },
            }}
          >
            {entry.dataKey === 'hours' ? (
              <Box
                sx={{
                  width: { xs: 16, sm: 20 },
                  height: { xs: 12, sm: 14 },
                  background: `linear-gradient(135deg, ${normalPrimary} 0%, ${normalPrimaryLight} 100%)`,
                  borderRadius: 1.5,
                  flexShrink: 0,
                }}
              />
            ) : (
              <Box
                sx={{
                  width: { xs: 16, sm: 20 },
                  height: { xs: 2.5, sm: 3 },
                  backgroundColor: normalSecondary,
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              />
            )}
            <Typography
              variant="body2"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                fontWeight: 500,
                color: theme.palette.text.secondary,
                whiteSpace: 'nowrap',
              }}
            >
              {entry.value}
            </Typography>
          </Box>
        ))}
      </Box>
    )
  }

  return (
    <>
      {hasData ? (
        <Box
          sx={{
            width: '100%',
            height,
            '& .recharts-cartesian-axis-tick-value': {
              fontSize: { xs: '0.65rem', sm: '0.8rem' },
              fontWeight: 500,
            },
            '& .recharts-label': {
              fontSize: { xs: '0.7rem', sm: '0.85rem' },
              fontWeight: 500,
            }
          }}
        >
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

              <CartesianGrid
                strokeDasharray="3 3"
                stroke={alpha(theme.palette.divider, 0.3)}
                vertical={false}
              />

              {/* X-Axis: Days of Week */}
              <XAxis
                dataKey="day"
                stroke={theme.palette.text.secondary}
                tick={(props: any) => {
                  const { x, y, payload } = props
                  const index = chartData.findIndex(item => item.day === payload.value)
                  const isCurrentDay = index === currentDayMappedIndex
                  const isMobile = window.innerWidth < 600
                  
                  // Show abbreviated day names on mobile
                  const displayValue = isMobile ? payload.value.substring(0, 3) : payload.value
                  
                  return (
                    <text
                      x={x}
                      y={y + 10}
                      textAnchor="middle"
                      fill={isCurrentDay ? vibrantPrimary : theme.palette.text.secondary}
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
                axisLine={{ stroke: alpha(theme.palette.divider, 0.3) }}
                tickLine={false}
              />

              {/* Primary Y-Axis (Left): Total Hours */}
              <YAxis
                yAxisId="left"
                orientation="left"
                stroke={alpha(normalPrimary, 0.7)}
                tick={{
                  fontSize: window.innerWidth < 600 ? 10 : 13,
                  fill: theme.palette.text.secondary,
                  fontWeight: 500,
                }}
                width={window.innerWidth < 600 ? 40 : 65}
                axisLine={{ stroke: alpha(theme.palette.divider, 0.3) }}
                tickLine={false}
              />

              {/* Secondary Y-Axis (Right): Average Session Duration */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke={alpha(normalSecondary, 0.7)}
                tick={{
                  fontSize: window.innerWidth < 600 ? 10 : 13,
                  fill: theme.palette.text.secondary,
                  fontWeight: 500,
                }}
                width={window.innerWidth < 600 ? 40 : 65}
                axisLine={{ stroke: alpha(theme.palette.divider, 0.3) }}
                tickLine={false}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ fill: alpha(theme.palette.primary.main, 0.05) }} />

              <Legend content={<CustomLegend />} />

              {/* Total Hours - Bar Chart with Gradient */}
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

              {/* Average Session Duration - Line Chart */}
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
                      stroke={theme.palette.background.paper}
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
                      stroke={theme.palette.background.paper}
                      strokeWidth={isMobile ? 2.5 : 3}
                    />
                  )
                }}
              />
            </ComposedChart>
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
            backgroundColor: alpha(theme.palette.divider, 0.02),
            borderRadius: { xs: 2, sm: 3 },
            border: `1px dashed ${alpha(theme.palette.divider, 0.3)}`,
            px: 2,
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500,
              fontSize: { xs: '0.8rem', sm: '0.9rem' },
              textAlign: 'center',
            }}
          >
            {noDataMessage}
          </Typography>
        </Box>
      )}
    </>
  )
}

export default DayOfWeekDualAxisChart