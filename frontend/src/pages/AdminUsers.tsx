import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from '@/components/ui/pagination'
import { adminApi } from '../services/api'
import { resolveAssetUrl } from '@/lib/asset-url'
import { formatDate } from '../utils/formatters'
import type { AdminUserSummary, PagedResponse } from '../types'

const DEBOUNCE_MS = 300
const PAGE_SIZE = 20

/**
 * Search/browse every account in the app. Unlike People's search (which requires two
 * characters and only finds people with a handle), this one allows an empty query to
 * browse everyone and surfaces accounts stuck mid-onboarding too - "can't get past
 * onboarding" is exactly the kind of ticket this directory exists for.
 */
function AdminUsers() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<PagedResponse<AdminUserSummary> | null>(null)
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    setLoading(true)
    debounceRef.current = setTimeout(() => {
      adminApi
        .searchUsers(query.trim(), page, PAGE_SIZE)
        .then((response) => setResult(response.data))
        .catch(() => setResult(null))
        .finally(() => setLoading(false))
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, page])

  // A new search always starts back at the first page - staying on page 3 of a
  // different result set would silently show the wrong slice of it.
  useEffect(() => {
    setPage(0)
  }, [query])

  return (
    <div>
      <h1 className="mb-2 text-h2 font-bold">{t('admin.users.title')}</h1>
      <p className="mb-6 text-body-sm text-text-secondary">{t('admin.users.subtitle')}</p>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('admin.users.searchPlaceholder')}
          aria-label={t('admin.users.searchPlaceholder')}
          className="pl-9"
          autoFocus
        />
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 bg-border" />
          ))}
        </div>
      )}

      {!loading && (!result || result.content.length === 0) && (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-6">
          <Users className="mt-0.5 size-5 shrink-0 text-text-secondary" />
          <p className="text-body-sm text-text-secondary">{t('admin.users.noResults')}</p>
        </div>
      )}

      {!loading && result && result.content.length > 0 && (
        <>
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-surface-raised hover:bg-surface-raised">
                  <TableHead>{t('admin.users.columnUser')}</TableHead>
                  <TableHead>{t('admin.users.columnEmail')}</TableHead>
                  <TableHead>{t('admin.users.columnHandle')}</TableHead>
                  <TableHead>{t('admin.users.columnCreatedAt')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.content.map((user) => (
                  <TableRow key={user.id} className="cursor-pointer">
                    <TableCell>
                      <Link to={`/admin/users/${user.id}`} className="flex items-center gap-3">
                        <Avatar className="size-8 shrink-0">
                          <AvatarImage src={resolveAssetUrl(user.profilePictureUrl)} alt="" />
                          <AvatarFallback>
                            {(user.displayName ?? user.handle ?? user.username ?? '?').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-body-sm font-medium text-text-primary">
                          {user.displayName ?? user.username}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-body-sm text-text-secondary">{user.email}</TableCell>
                    <TableCell className="text-body-sm text-text-secondary">
                      {user.handle ? `@${user.handle}` : t('admin.users.noHandle')}
                    </TableCell>
                    <TableCell className="text-body-sm text-text-secondary">
                      {formatDate(user.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {result.totalPages > 1 && (
            <Pagination className="mt-4 justify-start">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    disabled={page === 0}
                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                  />
                </PaginationItem>
                <PaginationItem className="px-2 text-body-sm text-text-secondary">
                  {t('admin.users.pageOf', { page: page + 1, totalPages: result.totalPages })}
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    disabled={page + 1 >= result.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  )
}

export default AdminUsers
