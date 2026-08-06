/** Longest edge of a stored avatar. Displayed at 80px at the very largest, so this is
 *  already generous for a high-density screen. */
const AVATAR_SIZE = 512

/** Enough to survive being scaled up on a retina screen, well short of a photo's weight. */
const JPEG_QUALITY = 0.9

/**
 * Turns whatever came off a camera or a disk into a square avatar.
 *
 * Done in the browser rather than on the server for two reasons: a phone photo is several
 * megabytes and there is no sense uploading all of it to throw most of it away, and the
 * alternative - re-encoding server-side - means either dropping WebP support or adding an
 * image library to the backend for the sake of one endpoint.
 *
 * Cropped from the centre rather than squashed, since a squashed face is worse than a
 * cropped one. Flattened onto white because JPEG has no alpha, and a transparent PNG
 * exported without a backdrop comes out black.
 */
export async function toSquareAvatar(file: File): Promise<Blob> {
  const source = await loadImage(file)

  const edge = Math.min(source.width, source.height)
  const sx = (source.width - edge) / 2
  const sy = (source.height - edge) / 2
  const target = Math.min(edge, AVATAR_SIZE)

  const canvas = document.createElement('canvas')
  canvas.width = target
  canvas.height = target

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas is unavailable')
  }
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, target, target)
  context.drawImage(source, sx, sy, edge, edge, 0, 0, target, target)

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
async function loadImage(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
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
