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
  height = 300,
  noDataMessage = 'No data available'
}: ReusablePieChartProps) {
  const theme = useTheme()
  const hasData = data.length > 0 && data.some(item => item.value > 0)
  const filteredData = data.filter(item => item.value > 0)

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
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'column', md: 'row' }, 
          gap: { xs: 2, md: 3 }, 
          alignItems: 'center',
          width: '100%' 
        }}>
          <Box sx={{ 
            width: { xs: '100%', md: '60%' },
            height: { xs: 250, sm: 280, md: 300 },
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center'
          }}>
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
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: { xs: 1, md: 1.5 },
              width: { xs: '100%', md: '40%' },
              justifyContent: 'center',
            }}
          >
            {filteredData.map((entry, index) => (
              <Box 
                key={`legend-${index}`}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: entry.fill,
                    flexShrink: 0,
                  }}
                />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontSize: '0.875rem',
                    lineHeight: 1.3,
                    color: theme.palette.text.primary,
                  }}
                >
                  {entry.fullName || entry.name}
                </Typography>
              </Box>
            ))}
          </Box>
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
