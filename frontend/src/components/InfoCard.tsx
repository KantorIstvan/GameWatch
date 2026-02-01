import { ReactNode } from 'react'
import { Box, Typography, Paper, alpha, useTheme } from '@mui/material'

interface InfoCardProps {
  icon: ReactNode
  iconColor: string
  title: string
  value: string | number
  subtitle?: string
}

function InfoCard({ icon, iconColor, title, value, subtitle }: InfoCardProps) {
  const theme = useTheme()

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 4, // Using consistent card padding (32px)
        height: '100%',
        borderRadius: 3, // Using consistent card border radius (24px)
        background: alpha(theme.palette.background.paper, 0.6),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}
    >
      <Box display="flex" alignItems="center" mb={2}>
        <Box sx={{ mr: 1, color: iconColor }}>
          {icon}
        </Box>
        <Typography variant="h6" fontWeight="bold">
          {title}
        </Typography>
      </Box>
      <Typography 
        variant="h5" 
        fontWeight="bold" 
        color={iconColor}
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {subtitle}
        </Typography>
      )}
    </Paper>
  )
}

export default InfoCard
