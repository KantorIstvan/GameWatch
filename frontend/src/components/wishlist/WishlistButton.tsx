import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WishlistButtonProps {
  wishlisted: boolean
  onToggle: () => Promise<void> | void
  size?: 'icon' | 'icon-sm'
  /** Set when the button sits inside a link or another clickable row. */
  stopPropagation?: boolean
  className?: string
}

/**
 * Adds or removes a game from the viewer's wishlist. A filled heart means it is on the
 * list, an outline means it is not - one control standing in for the same on/off shape the
 * rating stars use.
 */
function WishlistButton({
  wishlisted,
  onToggle,
  size = 'icon-sm',
  stopPropagation = false,
  className,
}: WishlistButtonProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  const handleClick = useCallback(
    async (event: React.MouseEvent) => {
      if (stopPropagation) {
        event.preventDefault()
        event.stopPropagation()
      }
      setBusy(true)
      try {
        await onToggle()
      } finally {
        setBusy(false)
      }
    },
    [onToggle, stopPropagation]
  )

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      disabled={busy}
      onClick={handleClick}
      aria-pressed={wishlisted}
      aria-label={wishlisted ? t('wishlist.remove') : t('wishlist.add')}
      className={cn(
        'text-text-secondary hover:text-accent',
        wishlisted && 'text-accent hover:text-accent',
        className
      )}
    >
      <Heart className={cn('size-4', wishlisted && 'fill-current')} />
    </Button>
  )
}

export default WishlistButton
