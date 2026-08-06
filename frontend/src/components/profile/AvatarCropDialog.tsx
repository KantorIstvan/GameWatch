import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { AVATAR_SIZE, renderAvatarCrop, type AvatarCropRect } from '@/lib/image'

/** CSS pixel size of the square crop stage - keep in sync with the `size-72` class below,
 *  the geometry math needs to know the exact on-screen size it's reasoning about. */
const STAGE_SIZE = 288

const MIN_ZOOM = 1
const MAX_ZOOM = 3
/** CSS-pixel nudge per arrow-key press, for repositioning without a pointer. */
const KEYBOARD_NUDGE = 10

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

interface Offset {
  x: number
  y: number
}

interface AvatarCropDialogProps {
  /** The just-picked file, or null when no crop is in progress (also controls `open`). */
  file: File | null
  /** Dialog dismissed (Cancel, Esc, overlay click, close button) without producing a crop. */
  onCancel: () => void
  /**
   * The user confirmed a crop. Rejects to signal upload failure to the dialog, which then
   * stays open (with the crop preserved) so the person can retry without re-picking.
   */
  onConfirm: (image: Blob) => Promise<void>
}

/**
 * Lets the person choose their own crop instead of having one picked for them: drag to
 * reposition, a slider to zoom, confirmed against a circular preview that mirrors how
 * Avatar actually renders the picture (rounded-full - see components/ui/avatar.tsx).
 *
 * The stored file is still a square, exactly like the old auto-crop produced - only the
 * *circular preview* is round. That square-stored/circle-displayed split already existed
 * before this component; it's not new behavior.
 */
function AvatarCropDialog({ file, onCancel, onConfirm }: AvatarCropDialogProps) {
  const { t } = useTranslation()
  const imgRef = useRef<HTMLImageElement>(null)
  const dragState = useRef<{ pointerId: number; startX: number; startY: number; startOffset: Offset } | null>(null)

  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null)
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const [submitting, setSubmitting] = useState(false)

  // New file picked (or the dialog closed): load it fresh and reset the crop.
  useEffect(() => {
    if (!file) {
      setImgSrc(null)
      setNaturalSize(null)
      return
    }
    const url = URL.createObjectURL(file)
    setImgSrc(url)
    setNaturalSize(null)
    setZoom(MIN_ZOOM)
    setOffset({ x: 0, y: 0 })
    return () => URL.revokeObjectURL(url)
  }, [file])

  const baseScale = naturalSize ? STAGE_SIZE / Math.min(naturalSize.width, naturalSize.height) : 1
  const totalScale = baseScale * zoom
  const displayedWidth = naturalSize ? naturalSize.width * totalScale : 0
  const displayedHeight = naturalSize ? naturalSize.height * totalScale : 0
  const maxOffsetX = Math.max(0, (displayedWidth - STAGE_SIZE) / 2)
  const maxOffsetY = Math.max(0, (displayedHeight - STAGE_SIZE) / 2)

  const handleImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
  }, [])

  const handleZoomChange = useCallback(
    ([nextZoom]: number[]) => {
      if (!naturalSize) return
      const nextTotalScale = baseScale * nextZoom
      const nextMaxX = Math.max(0, (naturalSize.width * nextTotalScale - STAGE_SIZE) / 2)
      const nextMaxY = Math.max(0, (naturalSize.height * nextTotalScale - STAGE_SIZE) / 2)
      setZoom(nextZoom)
      setOffset((prev) => ({
        x: clamp(prev.x, -nextMaxX, nextMaxX),
        y: clamp(prev.y, -nextMaxY, nextMaxY),
      }))
    },
    [baseScale, naturalSize]
  )

  const applyOffsetDelta = useCallback(
    (dx: number, dy: number, from: Offset) => {
      setOffset({
        x: clamp(from.x + dx, -maxOffsetX, maxOffsetX),
        y: clamp(from.y + dy, -maxOffsetY, maxOffsetY),
      })
    },
    [maxOffsetX, maxOffsetY]
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!naturalSize) return
      event.currentTarget.setPointerCapture(event.pointerId)
      dragState.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startOffset: offset }
    },
    [naturalSize, offset]
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragState.current
      if (!drag || drag.pointerId !== event.pointerId) return
      applyOffsetDelta(event.clientX - drag.startX, event.clientY - drag.startY, drag.startOffset)
    },
    [applyOffsetDelta]
  )

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (dragState.current?.pointerId === event.pointerId) {
      dragState.current = null
    }
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!naturalSize) return
      const deltas: Record<string, [number, number]> = {
        ArrowLeft: [-KEYBOARD_NUDGE, 0],
        ArrowRight: [KEYBOARD_NUDGE, 0],
        ArrowUp: [0, -KEYBOARD_NUDGE],
        ArrowDown: [0, KEYBOARD_NUDGE],
      }
      const delta = deltas[event.key]
      if (!delta) return
      event.preventDefault()
      applyOffsetDelta(delta[0], delta[1], offset)
    },
    [applyOffsetDelta, naturalSize, offset]
  )

  const handleCancel = useCallback(() => {
    if (submitting) return
    onCancel()
  }, [onCancel, submitting])

  const handleConfirm = useCallback(async () => {
    const img = imgRef.current
    if (!img || !naturalSize) return

    const sSize = STAGE_SIZE / totalScale
    const crop: AvatarCropRect = {
      sx: clamp((displayedWidth / 2 - STAGE_SIZE / 2 - offset.x) / totalScale, 0, naturalSize.width - sSize),
      sy: clamp((displayedHeight / 2 - STAGE_SIZE / 2 - offset.y) / totalScale, 0, naturalSize.height - sSize),
      sSize,
    }

    setSubmitting(true)
    try {
      const blob = await renderAvatarCrop(img, crop, AVATAR_SIZE)
      await onConfirm(blob)
    } catch {
      // Upload failure is already surfaced by the caller's own toast - keep the dialog
      // open with the crop intact so retrying doesn't mean picking the file all over again.
    } finally {
      setSubmitting(false)
    }
  }, [displayedHeight, displayedWidth, naturalSize, offset, onConfirm, totalScale])

  return (
    <Dialog open={file !== null} onOpenChange={(next) => !next && handleCancel()}>
      <DialogContent showCloseButton={!submitting} className="rounded-xl sm:max-w-md">
        <DialogTitle className="text-h4 font-semibold">{t('settings.profile.crop.title')}</DialogTitle>
        <p className="-mt-2 text-body-sm text-text-secondary">{t('settings.profile.crop.description')}</p>

        <div className="flex flex-col items-center gap-6 py-2">
          <div
            role="group"
            aria-label={t('settings.profile.crop.dragHint')}
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={handleKeyDown}
            className="relative size-72 touch-none overflow-hidden rounded-lg bg-surface outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
            style={{ cursor: naturalSize ? 'grab' : 'default' }}
          >
            {imgSrc && (
              <img
                ref={imgRef}
                src={imgSrc}
                alt=""
                draggable={false}
                onLoad={handleImageLoad}
                className="pointer-events-none absolute top-1/2 left-1/2 max-w-none select-none"
                style={
                  naturalSize
                    ? {
                        width: displayedWidth,
                        height: displayedHeight,
                        transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                      }
                    : { opacity: 0 }
                }
              />
            )}
            <div className="avatar-crop-mask pointer-events-none absolute inset-0 rounded-full" />
          </div>

          <div className="flex w-full max-w-72 items-center gap-3">
            <ZoomOut className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
            <Slider
              value={[zoom]}
              onValueChange={handleZoomChange}
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              disabled={!naturalSize}
              aria-label={t('settings.profile.crop.zoomLabel')}
            />
            <ZoomIn className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button type="button" variant="outline" disabled={submitting} onClick={handleCancel} className="h-12 w-full">
            {t('common.cancel')}
          </Button>
          <Button type="button" disabled={submitting || !naturalSize} onClick={handleConfirm} className="h-12 w-full">
            {submitting ? t('settings.profile.crop.saving') : t('settings.profile.crop.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AvatarCropDialog
