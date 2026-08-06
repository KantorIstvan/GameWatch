import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MessageSquare, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { reviewsApi } from '../../services/api'
import type { GameReview, ReviewReply } from '../../types'

const MAX_REPLY_LENGTH = 1000

interface ReviewRepliesProps {
  review: GameReview
  /** Both endpoints hand back the whole review, so the thread re-renders from one response. */
  onReviewChange: (review: GameReview) => void
}

/**
 * The conversation under one review.
 *
 * Flat, and deliberately so: what people want here is to answer the person who wrote the
 * review, not to hold a nested argument three levels down where nobody scrolls. It also
 * stays collapsed until asked for, so a review list reads as reviews rather than as a
 * forum.
 */
function ReviewReplies({ review, onReviewChange }: ReviewRepliesProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  const replies = review.replies ?? []

  const submit = useCallback(async () => {
    setBusy(true)
    try {
      const response = await reviewsApi.addReply(review.id, body.trim())
      onReviewChange(response.data)
      setBody('')
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('reviews.replies.failed'))
    } finally {
      setBusy(false)
    }
  }, [review.id, body, onReviewChange, t])

  const remove = useCallback(
    async (reply: ReviewReply) => {
      setBusy(true)
      try {
        const response = await reviewsApi.deleteReply(reply.id)
        onReviewChange(response.data)
        toast.success(t('reviews.replies.deleted'))
      } catch (err: any) {
        toast.error(err.response?.data?.message || t('reviews.replies.failed'))
      } finally {
        setBusy(false)
      }
    },
    [onReviewChange, t]
  )

  return (
    <div className="mt-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="text-text-secondary hover:text-accent"
      >
        <MessageSquare className="size-4" />
        {replies.length > 0
          ? t('reviews.replies.count', { count: replies.length })
          : t('reviews.replies.reply')}
      </Button>

      {open && (
        <div className="mt-3 border-l-2 border-border pl-4">
          {replies.length > 0 && (
            <ul className="mb-4 flex flex-col gap-3">
              {replies.map((reply) => (
                <li key={reply.id} className="flex items-start gap-3">
                  <Avatar className="size-7 shrink-0">
                    <AvatarImage src={reply.authorPictureUrl ?? undefined} alt="" />
                    <AvatarFallback>
                      {(reply.authorHandle ?? '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    {/* An account with no handle yet cannot be linked to - there is no
                        address for it until one is claimed. */}
                    {reply.authorHandle ? (
                      <Link
                        to={`/u/${reply.authorHandle}`}
                        className="text-body-sm font-medium transition-colors duration-150 ease-standard hover:text-accent"
                      >
                        {reply.authorDisplayName ?? reply.authorHandle}
                      </Link>
                    ) : (
                      <span className="text-body-sm font-medium">
                        {reply.authorDisplayName}
                      </span>
                    )}
                    <p className="whitespace-pre-wrap text-body-sm text-text-secondary">
                      {reply.body}
                    </p>
                  </div>

                  {reply.viewerCanDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => remove(reply)}
                      aria-label={t('reviews.replies.delete')}
                      className="shrink-0 text-text-secondary hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={MAX_REPLY_LENGTH}
            placeholder={t('reviews.replies.placeholder')}
            aria-label={t('reviews.replies.placeholder')}
          />
          <Button
            size="sm"
            onClick={submit}
            disabled={busy || body.trim().length === 0}
            className="mt-2"
          >
            {t('reviews.replies.send')}
          </Button>
        </div>
      )}
    </div>
  )
}

export default ReviewReplies
