import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatTimeHMS } from '../../utils/formatters'
import { Playthrough } from '../../types'

interface TimerDisplayProps {
  playthrough: Playthrough
  elapsedTime: number
  currentSessionTime?: number
  timerGradient: string
  onEdit: () => void
  onDelete: () => void
  children?: React.ReactNode
  statusText: string
}

function TimerDisplay({
  playthrough,
  elapsedTime,
  currentSessionTime,
  timerGradient,
  onEdit,
  onDelete,
  children,
  statusText
}: TimerDisplayProps) {
  const showDualTimers = (playthrough.isActive || playthrough.isPaused) && currentSessionTime !== undefined

  const overallTime = (playthrough.isActive || playthrough.isPaused)
    ? (playthrough.durationSeconds || 0)
    : elapsedTime

  const canEdit = (!playthrough.isActive || (playthrough.durationSeconds === 0 && !playthrough.startedAt)) && !playthrough.isCompleted && !playthrough.isDropped

  return (
    <div
      className="relative mb-6 rounded-xl p-8 text-center text-white shadow-3 transition-[background] duration-500 ease-in-out"
      style={{ background: timerGradient }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="absolute right-4 top-4 text-white hover:bg-white/20 hover:text-white"
          >
            <Trash2 className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete playthrough</TooltipContent>
      </Tooltip>

      {showDualTimers ? (
        <>
          <p className="text-caption font-semibold uppercase tracking-wide opacity-90">
            Current Session
          </p>
          <div className="my-4 flex flex-col items-center justify-center gap-4">
            <p className="text-center font-mono text-4xl font-bold tracking-widest sm:text-5xl md:text-6xl">
              {formatTimeHMS(currentSessionTime)}
            </p>

            <div className="flex flex-col items-center gap-1 opacity-80">
              <p className="text-caption uppercase tracking-wide">Total Playtime</p>
              <p className="text-center font-mono text-h4 font-semibold tracking-wide sm:text-h3">
                {formatTimeHMS(overallTime)}
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="text-caption opacity-90">Time Played</p>
          <div className="my-4 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-0">
            <p className="text-center font-mono text-4xl font-bold tracking-widest sm:text-5xl md:text-6xl">
              {formatTimeHMS(elapsedTime)}
            </p>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                title="Edit time manually"
                className="size-12 bg-white/15 text-white hover:bg-white/25 sm:ml-4 sm:size-auto sm:bg-transparent sm:hover:bg-white/20"
              >
                <Pencil className="size-6 sm:size-5" />
              </Button>
            )}
          </div>
        </>
      )}

      {children}

      <div className="mt-6">
        <p className="text-body-sm opacity-70">{statusText}</p>
      </div>
    </div>
  )
}

export default TimerDisplay
