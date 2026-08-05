import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

interface GameCoverBackdropProps {
  imageUrl?: string
  className?: string
}

/**
 * Decorative cover artwork pinned to the top-right corner of a page, dissolving
 * diagonally toward its bottom-left so the page reads as belonging to one game
 * without the artwork ever competing with the content sitting on top of it.
 *
 * Renders nothing at all when there is no artwork, so a game without a cover
 * keeps exactly the layout it has today.
 */
function GameCoverBackdrop({ imageUrl, className }: GameCoverBackdropProps) {
  const { mode } = useTheme()

  if (!imageUrl) return null

  return (
    <div
      aria-hidden="true"
      className={cn(
        // The negative inset cancels the app shell's content padding so the artwork
        // runs to the edge of the content area and up under the translucent header,
        // rather than floating inset from the corner. Clipped here so it can never
        // widen the page at small breakpoints.
        'pointer-events-none absolute -inset-x-4 -top-4 -z-10 flex justify-end overflow-hidden sm:-inset-x-6 sm:-top-6 md:-top-8',
        className
      )}
    >
      <img
        src={imageUrl}
        alt=""
        className={cn(
          'cover-dissolve-bl aspect-3/4 w-40 shrink-0 object-cover sm:w-64 lg:w-80 xl:w-96',
          // Same reasoning as GameBannerCard: identical artwork reads far stronger
          // against a near-black surface than against a white one, so the dark theme
          // needs the extra step to land at the same perceived weight. Both steps stay
          // low enough that the corner never darkens text below the AA contrast floor.
          mode === 'dark' ? 'opacity-30' : 'opacity-20'
        )}
      />
    </div>
  )
}

export default GameCoverBackdrop
