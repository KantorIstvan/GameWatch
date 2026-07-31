import { Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Playthrough } from '../../types'
import { formatPlaythroughType, getPlaythroughTypeColor } from '../../utils/playthroughUtils'

interface PlaythroughHeaderProps {
  playthrough: Playthrough
  gameName: string
  onEditTitle: () => void
  onImport?: () => void
  showImportButton: boolean
  t: any
}

function PlaythroughHeader({
  playthrough,
  gameName,
  onEditTitle,
  onImport,
  showImportButton,
  t
}: PlaythroughHeaderProps) {
  const alreadyImported = playthrough.importedFromPlaythroughId !== null && playthrough.importedFromPlaythroughId !== undefined

  return (
    <>
      <h1 className="mb-1 text-h2 font-normal">{gameName}</h1>

      <div className={cn('flex items-center gap-1', playthrough.title ? 'mb-0' : 'mb-4')}>
        {playthrough.title ? (
          <p className="text-h4 text-text-secondary">{playthrough.title}</p>
        ) : (
          <p className="text-body-sm italic text-text-secondary">{t('playthrough.noTitle')}</p>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onEditTitle}
              className="text-text-secondary hover:bg-accent/10 hover:text-accent"
            >
              <Pencil className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('playthrough.editTitle')}</TooltipContent>
        </Tooltip>
        {showImportButton && onImport && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onImport}
                  disabled={alreadyImported}
                  className="text-caption disabled:border-success disabled:text-success disabled:opacity-70"
                >
                  {playthrough.importedFromPlaythroughId ? 'Imported ✓' : 'Import Time'}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {alreadyImported
                ? 'Already imported from another playthrough (one-time only)'
                : 'Import playtime from another playthrough'}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="mb-6 flex flex-row flex-wrap gap-2">
        <Badge
          className="font-semibold text-white"
          style={{ backgroundColor: getPlaythroughTypeColor(playthrough.playthroughType) }}
        >
          {formatPlaythroughType(playthrough.playthroughType)}
        </Badge>
        {playthrough.isCompleted && (
          <Badge className="bg-success font-semibold text-white">{t('playthrough.completed')}</Badge>
        )}
        {playthrough.isDropped && (
          <Badge variant="destructive" className="font-semibold">{t('playthrough.dropped')}</Badge>
        )}
        {playthrough.isActive && (
          <Badge className="bg-amber-500 font-semibold text-white">{t('playthrough.active')}</Badge>
        )}
      </div>
    </>
  )
}

export default PlaythroughHeader
