import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import AdminEditPlaythroughDialog from './AdminEditPlaythroughDialog'
import { adminApi } from '../../services/api'
import { formatDuration } from '../../utils/formatters'
import type { Playthrough } from '../../types'

interface AdminPlaythroughsTableProps {
  userId: number
}

function statusLabel(playthrough: Playthrough, t: (key: string) => string): { label: string; variant: 'default' | 'outline' | 'destructive' | 'secondary' } {
  if (playthrough.isActive) return { label: t('admin.users.playthroughs.statusActive'), variant: 'default' }
  if (playthrough.isPaused) return { label: t('admin.users.playthroughs.statusPaused'), variant: 'secondary' }
  if (playthrough.isDropped) return { label: t('admin.users.playthroughs.statusDropped'), variant: 'destructive' }
  if (playthrough.isCompleted) return { label: t('admin.users.playthroughs.statusCompleted'), variant: 'outline' }
  return { label: t('admin.users.playthroughs.statusNotStarted'), variant: 'outline' }
}

/** A target user's playthroughs, with an admin override edit action per row. */
function AdminPlaythroughsTable({ userId }: AdminPlaythroughsTableProps) {
  const { t } = useTranslation()
  const [playthroughs, setPlaythroughs] = useState<Playthrough[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Playthrough | null>(null)

  const fetchPlaythroughs = useCallback(() => {
    setLoading(true)
    adminApi
      .getPlaythroughs(userId)
      .then((response) => setPlaythroughs(response.data))
      .catch(() => setPlaythroughs(null))
      .finally(() => setLoading(false))
  }, [userId])

  useEffect(() => {
    fetchPlaythroughs()
  }, [fetchPlaythroughs])

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 bg-border" />
        ))}
      </div>
    )
  }

  if (!playthroughs || playthroughs.length === 0) {
    return <p className="text-body-sm text-text-secondary">{t('admin.users.playthroughs.empty')}</p>
  }

  return (
    <>
      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-raised hover:bg-surface-raised">
              <TableHead>{t('admin.users.playthroughs.columnGame')}</TableHead>
              <TableHead>{t('admin.users.playthroughs.columnStatus')}</TableHead>
              <TableHead>{t('admin.users.playthroughs.columnDuration')}</TableHead>
              <TableHead>{t('admin.users.playthroughs.columnSessions')}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {playthroughs.map((playthrough) => {
              const status = statusLabel(playthrough, t)
              return (
                <TableRow key={playthrough.id}>
                  <TableCell>
                    <span className="text-body-sm font-medium text-text-primary">{playthrough.gameName}</span>
                    {playthrough.title && (
                      <span className="block text-caption text-text-secondary">{playthrough.title}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-body-sm text-text-secondary">
                    {formatDuration(playthrough.durationSeconds ?? 0)}
                  </TableCell>
                  <TableCell className="text-body-sm text-text-secondary">{playthrough.sessionCount}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('admin.users.playthroughs.edit')}
                      onClick={() => setEditing(playthrough)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <AdminEditPlaythroughDialog
        userId={userId}
        playthrough={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          fetchPlaythroughs()
        }}
      />
    </>
  )
}

export default AdminPlaythroughsTable
