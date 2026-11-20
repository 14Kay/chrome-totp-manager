import { useState } from 'react'
import { getCachedLogoStyle, measureLogoStyle } from '@/lib/logoImage'

interface LogoImageProps {
	src: string
	alt: string
	onError: () => void
}

export function LogoImage({ src, alt, onError }: LogoImageProps) {
	const [style, setStyle] = useState(() => getCachedLogoStyle(src))
	const [allowPixelAccess, setAllowPixelAccess] = useState(true)

	return (
		<img
			key={allowPixelAccess ? 'anonymous' : 'default'}
			src={src}
			alt={alt}
			loading="lazy"
			crossOrigin={allowPixelAccess ? 'anonymous' : undefined}
			referrerPolicy="no-referrer"
			onLoad={event => {
				if (allowPixelAccess) setStyle(measureLogoStyle(event.currentTarget, src))
			}}
			onError={() => {
				// Retry without CORS before moving to the next source: sizing is optional.
				if (allowPixelAccess) setAllowPixelAccess(false)
				else onError()
			}}
			style={style}
			className="w-6 h-6 flex-shrink-0 object-contain"
		/>
	)
}
