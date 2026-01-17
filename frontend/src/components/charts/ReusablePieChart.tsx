import { Box, Typography, useTheme } from '@mui/material'
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
  minLabelPercent = 0.05, 
  showLabel = true,
  height = 300,
  noDataMessage = 'No data available'
}: ReusablePieChartProps) {
  const theme = useTheme()
  const hasData = data.length > 0 && data.some(item => item.value > 0)

  const renderLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props
    const RADIAN = Math.PI / 180
    
    if (percent < minLabelPercent) return null
    
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {name}
      </text>
    )
  }

  const tooltipContent = (value: any, name: string | undefined, props: any) => {
    const displayName = props?.payload?.fullName || name || ''
    return [`${Number(value).toFixed(1)}h`, displayName]
  }

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
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.filter(item => item.value > 0)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={showLabel ? renderLabel : false}
                outerRadius={85}
                fill="#8884d8"
                dataKey="value"
              >
                {data.filter(item => item.value > 0).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip 
                formatter={tooltipContent}
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                  color: theme.palette.text.primary,
                }}
                labelStyle={{
                  color: theme.palette.text.primary,
                }}
                itemStyle={{
                  color: theme.palette.text.primary,
                }}
              />
            </PieChart>
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

export default ReusablePieChart
