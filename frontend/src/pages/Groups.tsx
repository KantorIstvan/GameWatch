import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, Trophy, Plus, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import UserLink from '../components/social/UserLink'
import { groupsApi } from '../services/api'
import { useAuthContext } from '../contexts/AuthContext'
import { statColors } from '../lib/statColors'
import type { Group } from '../types'

/**
 * Groups and their challenge standings.
 *
 * No challenge can be scored on hours played, and the page says so. The health feature
 * discourages long unbroken sessions; a leaderboard ranked on time spent would pay people
 * to do exactly what the rest of the app asks them not to.
 */
function Groups() {
  const { t } = useTranslation()
  const { isAuthReady } = useAuthContext()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    groupsApi
      .getMyGroups()
      .then((response) => setGroups(response.data))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (isAuthReady) load()
  }, [isAuthReady, load])

  const create = useCallback(async () => {
    setCreating(true)
    try {
      await groupsApi.createGroup(newName, null)
      setNewName('')
      toast.success(t('groups.created'))
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('groups.createFailed'))
    } finally {
      setCreating(false)
    }
  }, [newName, load, t])

  if (loading) {
    return <Skeleton className="h-60 w-full bg-border" />
  }

  return (
    <div>
      <h1 className="mb-2 text-h2 font-bold">{t('groups.title')}</h1>

      <p className="mb-6 flex items-start gap-2 rounded-lg border border-border bg-surface/60 p-3 text-body-sm text-text-secondary backdrop-blur-xl">
        <Info className="mt-0.5 size-4 shrink-0" />
        {t('groups.noHoursExplainer')}
      </p>

      <div className="mb-8 flex flex-wrap items-end gap-3">
        <div className="min-w-50 flex-1">
          <Label htmlFor="new-group" className="mb-1 block text-body-sm font-semibold">
            {t('groups.newGroup')}
          </Label>
          <Input
            id="new-group"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('groups.namePlaceholder')}
            maxLength={60}
          />
        </div>
        <Button onClick={create} disabled={creating || newName.trim().length < 3}>
          <Plus className="size-4" />
          {t('groups.create')}
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-6">
          <Users className="mt-0.5 size-5 shrink-0 text-text-secondary" />
          <p className="text-body-sm text-text-secondary">{t('groups.empty')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-6">
          {groups.map((group) => (
            <li
              key={group.id}
              className="rounded-xl border border-border bg-surface/60 p-4 backdrop-blur-xl sm:p-6"
            >
              <p className="text-h4 font-semibold">{group.name}</p>
              <p className="mb-4 text-caption text-text-secondary">
                {t('groups.memberCount', { count: group.memberCount })}
                {group.viewerIsOwner && ` · ${t('groups.youOwnThis')}`}
              </p>

              {group.challenges.length === 0 ? (
                <p className="text-body-sm text-text-secondary">{t('groups.noChallenges')}</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {group.challenges.map((challenge) => (
                    <li key={challenge.id}>
                      <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
                        <span className="text-body-sm font-semibold">{challenge.name}</span>
                        <span className="text-caption text-text-secondary">
                          {t(`groups.metric.${challenge.metric}`)}
                          {challenge.target !== null && ` · ${t('groups.target', { count: challenge.target })}`}
                        </span>
                        {challenge.active && (
                          <span
                            className="rounded-full px-2 py-0.5 text-caption font-semibold"
                            style={{
                              color: statColors.green,
                              backgroundColor: `color-mix(in srgb, ${statColors.green} 12%, transparent)`,
                            }}
                          >
                            {t('groups.active')}
                          </span>
                        )}
                      </div>

                      <ol className="flex flex-col gap-2">
                        {challenge.standings.map((standing, index) => (
                          <li key={standing.handle} className="flex items-center gap-3">
                            <span className="w-5 shrink-0 text-caption text-text-secondary">
                              {index + 1}
                            </span>
                            <UserLink
                              handle={standing.handle}
                              displayName={standing.displayName}
                              pictureUrl={standing.profilePictureUrl}
                              size="sm"
                              className="min-w-0 flex-1"
                            />
                            {standing.reachedTarget && (
                              <Trophy className="size-4 shrink-0" style={{ color: statColors.yellow }} />
                            )}
                            <span className="shrink-0 text-body-sm font-semibold">
                              {standing.score}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Groups
