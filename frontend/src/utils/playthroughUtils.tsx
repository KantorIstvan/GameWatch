export const formatPlaythroughType = (type: string): string => {
  if (type === '100_percent' || type === '100%') return '100%'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export const getPlaythroughTypeColor = (type: string): string => {
  const normalizedType = type === '100_percent' ? '100%' : type
  const colors: Record<string, string> = {
    'story': '#9C27B0',
    'speedrun': '#FF5722',
    'casual': '#2196F3',
    '100%': '#4CAF50',
  }
  return colors[normalizedType] || '#757575'
}

export const formatDescription = (description: string): JSX.Element[] | null => {
  if (!description) return null
  
  const lines = description.split('\n')
  const elements: JSX.Element[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    if (line.startsWith('###')) {
      const headerText = line.replace(/^###\s*/, '')
      elements.push(
        <p key={i} className="mb-1 mt-6 text-h4 font-bold">
          {headerText}
        </p>
      )
    } else {
      elements.push(
        <p key={i} className="mb-3 text-body leading-8 text-text-secondary">
          {line}
        </p>
      )
    }
  }

  return elements
}
