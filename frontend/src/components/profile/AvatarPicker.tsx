import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageUp, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { userApi } from '../../services/api'
import { toSquareAvatar } from '../../lib/image'

interface AvatarPickerProps {
  value: string | null
  /** The letter shown while there is no picture - the handle's first character. */
  fallback: string
  onChange: (profilePictureUrl: string | null) => void
}

/**
 * Choosing, replacing and removing a profile picture.
 *
 * The picture is saved the moment it is picked rather than with the rest of the form. A
 * cropped preview that only becomes real on save leaves the person staring at a face that
 * is not yet theirs, and the upload is a separate endpoint anyway.
 */
function AvatarPicker({ value, fallback, onChange }: AvatarPickerProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const handleFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      // Lets the same file be picked twice in a row, which otherwise fires no change event.
      event.target.value = ''
      if (!file) return

      setBusy(true)
      try {
        const image = await toSquareAvatar(file)
        const response = await userApi.uploadAvatar(image)
        onChange(response.data.profilePictureUrl)
        toast.success(t('settings.profile.pictureSaved'))
      } catch (err: any) {
        toast.error(err.response?.data?.message || t('settings.profile.pictureFailed'))
      } finally {
        setBusy(false)
      }
    },
    [onChange, t]
  )

  const remove = useCallback(async () => {
    setBusy(true)
    try {
      await userApi.deleteAvatar()
      onChange(null)
      toast.success(t('settings.profile.pictureRemoved'))
    } catch {
      toast.error(t('settings.profile.pictureFailed'))
    } finally {
      setBusy(false)
    }
  }, [onChange, t])

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-20 shrink-0 border border-border">
        <AvatarImage src={value ?? undefined} alt="" />
        <AvatarFallback className="text-h3">{fallback}</AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-col items-start gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <ImageUp className="size-4" />
            {value ? t('settings.profile.changePicture') : t('settings.profile.addPicture')}
          </Button>

          {value && (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={remove}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
              {t('settings.profile.removePicture')}
            </Button>
          )}
        </div>

        <p className="text-caption text-text-secondary">{t('settings.profile.pictureHint')}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
        aria-label={t('settings.profile.changePicture')}
      />
    </div>
  )
}

export default AvatarPicker
