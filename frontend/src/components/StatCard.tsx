import React from 'react'
import { Card, CardContent, Box, Typography, alpha, useTheme } from '@mui/material'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color?: string
}

const StatCard = React.memo(({ title, value, icon, color }: StatCardProps) => {
  const theme = useTheme()
  
  return (
    <Card 
      sx={{ 
        height: '100%',
        borderRadius: 3, // Using consistent card border radius (24px)
        background: color 
          ? `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`
          : alpha(theme.palette.background.paper, 0.6),
        backdropFilter: color ? undefined : 'blur(20px)',
        border: `1px solid ${alpha(color || theme.palette.divider, color ? 0.2 : 0.1)}`,
      }}
    >
      <CardContent sx={{ p: 4 }}> {/* Using consistent card padding (32px) */}
        <Box display="flex" alignItems="center" mb={2}>
          <Box
            sx={{
              bgcolor: color || theme.palette.primary.main,
              color: 'white',
              p: 1,
              borderRadius: 2,
              display: 'flex',
              mr: 2,
              boxShadow: `0 4px 12px ${alpha(color || theme.palette.primary.main, 0.3)}`,
            }}
          >
            {icon}
          </Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight="bold" color={color || theme.palette.primary.main}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  )
})

StatCard.displayName = 'StatCard'

export default StatCard
