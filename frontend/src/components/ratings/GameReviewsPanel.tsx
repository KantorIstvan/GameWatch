import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ThumbsUp, Trophy, Clock, EyeOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import UserLink from '../social/UserLink'
import ReviewReplies from './ReviewReplies'
import { reviewsApi } from '../../services/api'
import { formatTime } from '../../utils/formatters'
import type { GameReview } from '../../types'

interface GameReviewsPanelProps {
  /** Null for a game nobody has rated or reviewed yet - see {@link useCatalogGame}. */
  gameId: number | null
  ensureGameId: () => Promise<number>
}

/**
 * Written reviews for a game.
 *
 * Sorted by helpfulness by default rather than recency: the newest review is whoever wrote
 * last, which is not the same as the one worth reading first.
 *
 * A game with no catalog row yet has no reviews to load, so the panel renders its empty
 * state and claims the row when the first review is submitted.
 */
function GameReviewsPanel({ gameId, ensureGameId }: GameReviewsPanelProps) {
  const { t, i18n } = useTranslation()
  const [reviews, setReviews] = useState<GameReview[]>([])
  const [sort, setSort] = useState<'helpful' | 'recent'>('helpful')
  const [onlyMyLanguage, setOnlyMyLanguage] = useState(false)
  const [body, setBody] = useState('')
  const [spoilers, setSpoilers] = useState(false)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    if (gameId === null) {
      setReviews([])
      return
    }
    reviewsApi
      .getReviews(gameId, sort, onlyMyLanguage ? i18n.language : undefined)
      .then((response) => {
        setReviews(response.data)
        const own = response.data.find((review: GameReview) => review.ownReview)
        if (own) {
          setBody(own.body)
          setSpoilers(own.containsSpoilers)
        }
      })
      .catch(() => setReviews([]))
  }, [gameId, sort, onlyMyLanguage, i18n.language])

  useEffect(load, [load])

  const submit = useCallback(async () => {
    setBusy(true)
    try {
      const id = await ensureGameId()
      await reviewsApi.submitReview(id, {
        body,
        containsSpoilers: spoilers,
        language: i18n.language,
      })
      toast.success(t('reviews.saved'))
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('reviews.failed'))
    } finally {
      setBusy(false)
    }
  }, [ensureGameId, body, spoilers, i18n.language, load, t])

  const remove = useCallback(async () => {
    // Only reachable with an existing review, which means a row already exists.
    if (gameId === null) {
      return
    }
    setBusy(true)
    try {
      await reviewsApi.deleteReview(gameId)
      setBody('')
      setSpoilers(false)
      toast.success(t('reviews.deleted'))
      load()
    } catch {
      toast.error(t('reviews.failed'))
    } finally {
      setBusy(false)
    }
  }, [gameId, load, t])

  // Every endpoint that touches a single review hands the whole thing back, so nothing here
  // has to reload the list to show one changed vote count or one new reply.
  const replaceReview = useCallback((updated: GameReview) => {
    setReviews((current) =>
      current.map((review) => (review.id === updated.id ? updated : review))
    )
  }, [])

  const toggleHelpful = useCallback(
    async (reviewId: number) => {
      try {
        const response = await reviewsApi.toggleHelpful(reviewId)
        replaceReview(response.data)
      } catch (err: any) {
        toast.error(err.response?.data?.message || t('reviews.failed'))
      }
    },
    [replaceReview, t]
  )

  const reveal = useCallback((reviewId: number) => {
    setRevealed((current) => new Set(current).add(reviewId))
  }, [])

  const ownReview = reviews.find((review) => review.ownReview)

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <p className="mb-4 text-body-sm font-bold sm:text-body-lg">{t('reviews.title')}</p>

      <div className="mb-6">
        <Label htmlFor="review-body" className="mb-1 block text-body-sm font-semibold">
          {ownReview ? t('reviews.editYours') : t('reviews.writeOne')}
        </Label>
        <Textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder={t('reviews.placeholder')}
        />
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="review-spoilers" checked={spoilers} onCheckedChange={setSpoilers} />
            <Label htmlFor="review-spoilers" className="text-body-sm">
              {t('reviews.containsSpoilers')}
            </Label>
          </div>
          <Button onClick={submit} disabled={busy || body.trim().length < 20}>
            {t('reviews.save')}
          </Button>
          {ownReview && (
            <Button variant="outline" onClick={remove} disabled={busy}>
              <Trash2 className="size-4" />
              {t('reviews.delete')}
            </Button>
          )}
        </div>
        <p className="mt-1 text-caption text-text-secondary">
          {t('reviews.minLength', { count: body.trim().length })}
        </p>
      </div>

      {reviews.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <ToggleGroup
            type="single"
            value={sort}
            onValueChange={(value) => value && setSort(value as 'helpful' | 'recent')}
            variant="outline"
          >
            <ToggleGroupItem value="helpful">{t('reviews.sortHelpful')}</ToggleGroupItem>
            <ToggleGroupItem value="recent">{t('reviews.sortRecent')}</ToggleGroupItem>
          </ToggleGroup>

          <div className="flex items-center gap-2">
            <Switch
              id="review-language"
              checked={onlyMyLanguage}
              onCheckedChange={setOnlyMyLanguage}
            />
            <Label htmlFor="review-language" className="text-body-sm">
              {t('reviews.onlyMyLanguage')}
            </Label>
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-4">
        {reviews.map((review) => {
          const hidden = review.containsSpoilers && !revealed.has(review.id)
          return (
            <li key={review.id} className="border-t border-border pt-4">
              <div className="mb-2 flex items-start gap-3">
                <UserLink
                  handle={review.authorHandle}
                  displayName={review.authorDisplayName}
                  pictureUrl={review.authorPictureUrl}
                  size="sm"
                  className="min-w-0 flex-1 items-start"
                  subtitle={
                    /* The evidence behind the opinion, which is the thing a review site
                       cannot show and this app can. */
                    <span className="flex flex-wrap items-center gap-x-3">
                      {review.authorScore !== null && (
                        <span className="font-semibold text-text-primary">
                          {review.authorScore}/10
                        </span>
                      )}
                      {review.authorPlaytimeSeconds > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatTime(review.authorPlaytimeSeconds)}
                        </span>
                      )}
                      {review.authorFinished && (
                        <span className="flex items-center gap-1">
                          <Trophy className="size-3" />
                          {t('reviews.finished')}
                        </span>
                      )}
                    </span>
                  }
                />

                {!review.ownReview && (
                  <Button
                    size="sm"
                    variant={review.viewerFoundHelpful ? 'default' : 'outline'}
                    onClick={() => toggleHelpful(review.id)}
                    aria-pressed={review.viewerFoundHelpful}
                  >
                    <ThumbsUp className="size-4" />
                    {review.helpfulCount}
                  </Button>
                )}
              </div>

              {hidden ? (
                <button
                  type="button"
                  onClick={() => reveal(review.id)}
                  className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border p-4 text-left text-body-sm text-text-secondary transition-colors duration-150 ease-standard hover:bg-border/10"
                >
                  <EyeOff className="size-4 shrink-0" />
                  {t('reviews.spoilerHidden')}
                </button>
              ) : (
                <p className="whitespace-pre-wrap text-body-sm">{review.body}</p>
              )}

              <ReviewReplies review={review} onReviewChange={replaceReview} />
            </li>
          )
        })}
      </ul>

      {reviews.length === 0 && (
        <p className="text-body-sm text-text-secondary">{t('reviews.none')}</p>
      )}
    </div>
  )
}

export default GameReviewsPanel
