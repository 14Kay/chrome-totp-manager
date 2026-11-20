import type { CSSProperties } from 'react'

const SAMPLE_SIZE = 128
const IMAGE_SIZE = 24
const MAX_VISIBLE_SIZE = 26
const TARGET_INK_AREA = 20 * 20
const styleCache = new Map<string, CSSProperties>()

export const getCachedLogoStyle = (src: string) => styleCache.get(src)

export function measureLogoStyle(image: HTMLImageElement, src: string): CSSProperties | undefined {
	const cached = styleCache.get(src)
	if (cached) return cached
	if (!image.naturalWidth || !image.naturalHeight) return undefined

	try {
		const canvas = document.createElement('canvas')
		canvas.width = canvas.height = SAMPLE_SIZE
		const context = canvas.getContext('2d', { willReadFrequently: true })
		if (!context) return undefined

		const ratio = Math.min(SAMPLE_SIZE / image.naturalWidth, SAMPLE_SIZE / image.naturalHeight)
		const width = image.naturalWidth * ratio
		const height = image.naturalHeight * ratio
		context.drawImage(image, (SAMPLE_SIZE - width) / 2, (SAMPLE_SIZE - height) / 2, width, height)
		const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
		let left = SAMPLE_SIZE
		let top = SAMPLE_SIZE
		let right = -1
		let bottom = -1
		let ink = 0

		for (let y = 0; y < SAMPLE_SIZE; y++) {
			for (let x = 0; x < SAMPLE_SIZE; x++) {
				const alpha = data[(y * SAMPLE_SIZE + x) * 4 + 3]
				if (alpha < 16) continue
				left = Math.min(left, x)
				top = Math.min(top, y)
				right = Math.max(right, x)
				bottom = Math.max(bottom, y)
				ink += alpha / 255
			}
		}
		if (!ink) return undefined

		const pixelSize = IMAGE_SIZE / SAMPLE_SIZE
		const longestSide = Math.max(right - left + 1, bottom - top + 1) * pixelSize
		const scale = Math.min(
			Math.sqrt(TARGET_INK_AREA / (ink * pixelSize * pixelSize)),
			MAX_VISIBLE_SIZE / longestSide,
			6
		)
		const offsetX = (SAMPLE_SIZE / 2 - (left + right + 1) / 2) * pixelSize * scale
		const offsetY = (SAMPLE_SIZE / 2 - (top + bottom + 1) / 2) * pixelSize * scale
		const style = { transform: `translate(${offsetX.toFixed(3)}px, ${offsetY.toFixed(3)}px) scale(${scale.toFixed(3)})` }
		if (styleCache.size >= 200) styleCache.delete(styleCache.keys().next().value!)
		styleCache.set(src, style)
		return style
	} catch {
		// Images that disallow pixel access still render at the default size.
		return undefined
	}
}
