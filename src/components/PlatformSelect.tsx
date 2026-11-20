import { useMemo, useState } from 'react'
import { List, Search } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'
import { useLogoCatalog } from '@/hooks/useLogoCatalog'
import { getPlatformLogo, normalizePlatform, type LogoPlatform } from '@/lib/logos'
import { Select } from './Select'

interface PlatformSelectProps {
	value: string
	onChange: (platform: LogoPlatform | undefined) => void
}

export function PlatformSelect({ value, onChange }: PlatformSelectProps) {
	const { t } = useLanguage()
	const { platforms, isLoading, hasError, retry } = useLogoCatalog()
	const [search, setSearch] = useState('')
	const filtered = useMemo(() => {
		const query = normalizePlatform(search.trim())
		return platforms.filter(platform =>
			normalizePlatform(platform.name).includes(query)
			|| [platform.domain, ...platform.additionalDomains].some(domain => normalizePlatform(domain).includes(query))
		)
	}, [platforms, search])
	const selected = platforms.find(platform => getPlatformLogo(platform) === value)
	const options = selected && !filtered.includes(selected) ? [selected, ...filtered] : filtered

	return (
		<div className="space-y-2">
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
				<input
					type="search"
					aria-label={t('searchPlatforms')}
					placeholder={t('searchPlatforms')}
					value={search}
					onChange={event => setSearch(event.target.value)}
					className="input w-full pl-10 pr-3 py-2 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
				/>
			</div>
			<Select
				id="platform-select"
				label={t('selectPlatform')}
				icon={List}
				value={value}
				onChange={event => {
					onChange(platforms.find(platform => getPlatformLogo(platform) === event.target.value))
					setSearch('')
				}}
				className="input"
				disabled={isLoading && !platforms.length}
				options={[
					{ value: '', label: t('customPlatform') },
					...options.map(platform => ({ value: getPlatformLogo(platform), label: platform.name })),
				]}
			/>
			<div aria-live="polite" className="text-xs text-gray-500 dark:text-gray-400">
				{isLoading && !platforms.length && <p>{t('loadingPlatforms')}</p>}
				{hasError && (
					<p>
						{t(platforms.length ? 'platformsUsingCache' : 'platformsLoadFailed')}{' '}
						<button type="button" onClick={retry} disabled={isLoading} className="text-blue-500 hover:underline disabled:opacity-50">
							{t('retry')}
						</button>
					</p>
				)}
				{!isLoading && !hasError && platforms.length > 0 && !filtered.length && <p>{t('noPlatformsFound')}</p>}
			</div>
			<p className="text-xs text-gray-500 dark:text-gray-400">
				{t('platformsSource')}{' '}
				<a href="https://2fa.directory/" target="_blank" rel="noopener noreferrer" className="hover:underline">2FA Directory</a>
				{' · '}
				<a href="https://github.com/2factorauth/" target="_blank" rel="noopener noreferrer" className="hover:underline">2factorauth</a>
			</p>
		</div>
	)
}
