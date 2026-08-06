/** Longest edge of a stored avatar. Displayed at 80px at the very largest, so this is
 *  already generous for a high-density screen. */
export const AVATAR_SIZE = 512

/** Enough to survive being scaled up on a retina screen, well short of a photo's weight. */
const JPEG_QUALITY = 0.9

/** A source rectangle in the picked image's own natural pixel coordinates. */
export interface AvatarCropRect {
  sx: number
  sy: number
  /** Both edges - the crop is always square. */
  sSize: number
}

/**
 * Turns whatever came off a camera or a disk into a square avatar, centre-cropped with
 * no user control. Used as the non-interactive fallback (e.g. if a crop rectangle was
 * never produced) - the interactive path in AvatarCropDialog is what runs by default.
 *
 * Cropped from the centre rather than squashed, since a squashed face is worse than a
 * cropped one.
 */
export async function toSquareAvatar(file: File): Promise<Blob> {
  const source = await loadImage(file)

  const edge = Math.min(source.width, source.height)
  const sx = (source.width - edge) / 2
  const sy = (source.height - edge) / 2
  const target = Math.min(edge, AVATAR_SIZE)

  return renderAvatarCrop(source, { sx, sy, sSize: edge }, target)
}

/**
 * Renders a square region of `source` onto a `target`x`target` canvas and encodes it as
 * a JPEG Blob. Shared by the auto-centre-crop fallback above and the interactive crop
 * dialog, so "flattened onto white because JPEG has no alpha, and a transparent PNG
 * exported without a backdrop comes out black" is handled in exactly one place rather
 * than duplicated (and potentially diverging) between the two crop paths.
 */
export async function renderAvatarCrop(
  source: CanvasImageSource,
  crop: AvatarCropRect,
  target: number = AVATAR_SIZE
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = target
  canvas.height = target

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas is unavailable')
  }
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, target, target)
  context.drawImage(source, crop.sx, crop.sy, crop.sSize, crop.sSize, 0, 0, target, target)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))),
      'image/jpeg',
      JPEG_QUALITY
    )
  })
}

/**
 * createImageBitmap where it exists, an <img> where it does not.
 *
 * The fallback is not dead weight: Safari only grew createImageBitmap relatively late, and
 * an avatar that silently fails to upload is a worse outcome than a few extra lines here.
 */
export async function loadImage(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file)
  }

  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Could not read the image'))
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
