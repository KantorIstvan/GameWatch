import { useTranslation } from 'react-i18next'
import { formatDurationWords } from '../utils/formatters'
import type { Game } from '../types'

interface DeleteGameWarningProps {
  game: Game | null
}

/**
 * Confirmation copy for deleting a game.
 *
 * Removing a game cascades to every playthrough recorded against it and to those
 * playthroughs' whole session history. The dialog used to say only "this action cannot be
 * undone", which reads as though the game itself is what disappears - the playthrough
 * dialog, deleting far less, was the one that spelled out that session data goes with it.
 * This states what is actually at stake, with the counts.
 */
function DeleteGameWarning({ game }: DeleteGameWarningProps) {
  const { t } = useTranslation()

  if (!game) {
    return null
  }

  const playthroughCount = game.playthroughCount ?? 0
  const sessionCount = game.sessionCount ?? 0
  const playtimeSeconds = game.totalPlaytimeSeconds ?? 0

  // Nothing has been recorded against this game yet, so there is no hidden cost to
  // removing it and the plain message is the honest one.
  if (playthroughCount === 0 && sessionCount === 0 && playtimeSeconds === 0) {
    return <>{t('games.confirmDelete', { gameName: game.name })}</>
  }

  const losses = [
    playthroughCount > 0 && t('games.confirmDeletePlaythroughs', { count: playthroughCount }),
    sessionCount > 0 && t('games.confirmDeleteSessions', { count: sessionCount }),
    playtimeSeconds > 0 &&
      t('games.confirmDeletePlaytime', { time: formatDurationWords(playtimeSeconds, t) }),
  ].filter(Boolean) as string[]

  return (
    <span className="block text-left">
      <span className="block">
        {t('games.confirmDeleteWithData', { gameName: game.name })}
      </span>

      <span className="mt-3 block rounded-lg bg-destructive/10 p-3">
        {losses.map((loss) => (
          <span key={loss} className="block text-body-sm font-semibold text-destructive">
            {loss}
          </span>
        ))}
      </span>

      <span className="mt-3 block text-body-sm">
        {t('games.confirmDeleteCannotUndo')}
      </span>
    </span>
  )
}

export default DeleteGameWarning
