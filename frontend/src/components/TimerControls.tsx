import { Play, Pause, Clock, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Playthrough } from '../types'

interface TimerControlsProps {
  playthrough: Playthrough
  onStart: () => void
  onPause: () => void
  onContinue: () => void
  onEndSession: () => void
  onFinish: () => void
  onDrop: () => void
  onPickup: () => void
  onOpenManualSession: () => void
  t: any
}

function TimerControls({
  playthrough,
  onStart,
  onPause,
  onContinue,
  onEndSession,
  onFinish,
  onDrop,
  onPickup,
  onOpenManualSession,
  t
}: TimerControlsProps) {
  const buttonClass = 'text-[0.8125rem] px-4 border-none text-white'
  const secondaryButtonClass = 'border border-white/30 bg-white/15 text-white hover:bg-white/25'

  return (
    <>
      <div className="mt-4 flex w-full flex-col justify-center gap-2 px-4 sm:w-auto sm:flex-row sm:px-0">
        {!playthrough.isActive ? (
          <Button
            onClick={playthrough.durationSeconds === 0 ? onStart : onContinue}
            disabled={playthrough.isCompleted || playthrough.isDropped}
            className={cn(buttonClass, 'min-w-auto bg-white text-black hover:bg-white/90 disabled:bg-white/30 disabled:text-black/30 sm:min-w-27.5')}
          >
            <Play className="size-4" />
            {(playthrough.durationSeconds ?? 0) === 0
              ? t('playthrough.start')
              : (playthrough.isPaused
                ? t('playthrough.continue')
                : t('playthrough.newSession'))}
          </Button>
        ) : (
          <Button
            onClick={onPause}
            className={cn(buttonClass, 'min-w-auto bg-white text-black hover:bg-white/90 sm:min-w-27.5')}
          >
            <Pause className="size-4" />
            {t('playthrough.pause')}
          </Button>
        )}

        {(playthrough.isActive || playthrough.isPaused) && (
          <Button
            onClick={onEndSession}
            className={cn(secondaryButtonClass, 'min-w-auto px-4 text-[0.8125rem] sm:min-w-30')}
          >
            <Clock className="size-4" />
            {t('playthrough.endSession')}
          </Button>
        )}

        {playthrough.playthroughType !== 'casual' && (
          <Button
            onClick={onFinish}
            disabled={playthrough.isCompleted || playthrough.isDropped || playthrough.isActive}
            className={cn(secondaryButtonClass, 'min-w-auto px-4 text-[0.8125rem] disabled:opacity-30 sm:min-w-25')}
          >
            <Square className="size-4" />
            {t('playthrough.finish')}
          </Button>
        )}

        {playthrough.playthroughType !== 'casual' && (
          <Button
            onClick={onDrop}
            disabled={playthrough.isCompleted || playthrough.isDropped || playthrough.isActive}
            className={cn(buttonClass, 'min-w-auto bg-destructive hover:bg-destructive/90 disabled:bg-destructive/30 sm:min-w-22.5')}
          >
            <Square className="size-4" />
            {t('playthrough.drop')}
          </Button>
        )}
      </div>

      {!playthrough.isActive && !playthrough.isPaused && !playthrough.isDropped && (
        <div className="mt-2 flex justify-center px-4 sm:px-0">
          <Button
            variant="outline"
            onClick={onOpenManualSession}
            disabled={playthrough.isCompleted}
            className="min-w-auto border-white/50 px-4 text-[0.8125rem] text-white hover:border-white hover:bg-white/10 disabled:border-white/20 disabled:text-white/30 sm:min-w-45"
          >
            <Clock className="size-4" />
            {t('playthrough.logManualSession')}
          </Button>
        </div>
      )}

      {playthrough.isDropped && (
        <div className="mt-2 flex justify-center px-4 sm:px-0">
          <Button
            onClick={onPickup}
            className={cn(secondaryButtonClass, 'min-w-auto px-4 text-[0.8125rem] sm:min-w-45')}
          >
            <Play className="size-4" />
            {t('playthrough.pickup')}
          </Button>
        </div>
      )}
    </>
  )
}

export default TimerControls
