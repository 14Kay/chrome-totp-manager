const IMAGE_BASE_URL = 'https://cdn.jsdelivr.net/gh/2factorauth/twofactorauth@master/img'
const IMAGE_FALLBACK_URL = 'https://raw.githubusercontent.com/2factorauth/twofactorauth/master/img'
const CATALOG_URL = 'https://api.2fa.directory/v3/totp.json'
const CACHE_KEY = 'platform_logos_2fa_v1'
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000
const IMAGE_FILENAME = /^[a-z\d][a-z\d._-]*\.(?:svg|png)$/i
const DOMAIN = /^(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z\d](?:[a-z\d-]*[a-z\d])?$/i

export interface LogoPlatform {
	name: string
	domain: string
	additionalDomains: string[]
	image: string
}

interface LogoCatalogState {
	platforms: LogoPlatform[]
	isLoading: boolean
	hasError: boolean
}

let state: LogoCatalogState = { platforms: [], isLoading: true, hasError: false }
let initialized = false
let pendingLoad: Promise<void> | undefined
const listeners = new Set<() => void>()

export const getLogoCatalog = () => state

export function subscribeLogoCatalog(listener: () => void) {
	listeners.add(listener)
	return () => { listeners.delete(listener) }
}

function publish(update: Partial<LogoCatalogState>) {
	state = { ...state, ...update }
	listeners.forEach(listener => listener())
}

export function parseLogoCatalog(data: unknown): LogoPlatform[] {
	if (!Array.isArray(data)) throw new Error('Invalid logo catalog')

	const platforms: LogoPlatform[] = []
	const domains = new Set<string>()
	for (const item of data) {
		if (!Array.isArray(item) || item.length !== 2) continue
		const [name, entry] = item
		if (typeof name !== 'string' || !name.trim() || !entry || typeof entry !== 'object') continue
		if (typeof entry.domain !== 'string' || !DOMAIN.test(entry.domain)) continue
		if (!Array.isArray(entry.tfa) || !entry.tfa.includes('totp')) continue
		const domain = entry.domain.toLowerCase()
		const image = entry.img ?? `${domain}.svg`
		if (domains.has(domain) || typeof image !== 'string' || !IMAGE_FILENAME.test(image)) continue
		const additionalDomains: string[] = Array.isArray(entry['additional-domains'])
			? entry['additional-domains'].filter((alias: unknown): alias is string => typeof alias === 'string' && DOMAIN.test(alias))
				.map((alias: string) => alias.toLowerCase())
			: []
		domains.add(domain)
		platforms.push({ name: name.trim(), domain, additionalDomains, image })
	}
	if (!platforms.length) throw new Error('Empty logo catalog')
	return platforms.sort((a, b) => a.name.localeCompare(b.name))
}

async function hydrateAndRefresh(force: boolean) {
	publish({ isLoading: true, hasError: false })
	if (!initialized) {
		initialized = true
		try {
			const result = await chrome.storage.local.get(CACHE_KEY)
			const cached = result[CACHE_KEY]
			if (cached && typeof cached === 'object' && 'updatedAt' in cached && typeof cached.updatedAt === 'number' && 'catalog' in cached) {
				const platforms = parseLogoCatalog(cached.catalog)
				const age = Date.now() - cached.updatedAt
				const isFresh = age >= 0 && age < CACHE_MAX_AGE
				publish({ platforms, isLoading: force || !isFresh })
				if (isFresh && !force) return
			}
		} catch {
			// An unavailable or invalid cache must not prevent a network refresh.
		}
	}

	try {
		const response = await fetch(CATALOG_URL, {
			credentials: 'omit',
			referrerPolicy: 'no-referrer',
			signal: AbortSignal.timeout(10_000),
		})
		if (!response.ok) throw new Error(`Logo catalog request failed: ${response.status}`)
		const catalog: unknown = await response.json()
		const platforms = parseLogoCatalog(catalog)
		publish({ platforms, isLoading: false })
		try {
			await chrome.storage.local.set({ [CACHE_KEY]: { catalog, updatedAt: Date.now() } })
		} catch {
			// Keep using the fetched catalog even if persisting it fails.
		}
	} catch {
		publish({ isLoading: false, hasError: true })
	}
}

export function loadLogoCatalog(force = false): Promise<void> {
	if (pendingLoad) return pendingLoad
	if (initialized && !force) return Promise.resolve()
	pendingLoad = hydrateAndRefresh(force).finally(() => { pendingLoad = undefined })
	return pendingLoad
}

export const retryLogoCatalog = () => { void loadLogoCatalog(true) }

export const normalizePlatform = (value: string) => value.toLowerCase().replace(/[\s._-]/g, '')

// Discover packaged logos at build time so local fallbacks don't need a brand list.
const localLogoIndex = new Map(
	Object.keys(import.meta.glob('/public/logos/*.{svg,png}')).map(path => {
		const filename = path.slice(path.lastIndexOf('/') + 1)
		const name = filename.replace(/(?:-(?:icon|color))?\.(?:svg|png)$/i, '')
		return [normalizePlatform(name), `/logos/${filename}`]
	})
)

function matchLocalLogo(value: string): string | undefined {
	const name = normalizePlatform(value.replace(/(?:-(?:icon|color))?\.(?:svg|png)$/i, ''))
	const key = /^(?:googleaccounts?|(?:accounts|myaccount)?googlecom)$/.test(name) ? 'google' : name
	return localLogoIndex.get(key)
}

export function getPlatformLogo(platform: LogoPlatform): string {
	// A domain identifies the service even when multiple services share one image.
	return platform.domain
}

const platformIndexes = new WeakMap<LogoPlatform[], Map<string, LogoPlatform>>()

function getPlatformIndex(platforms: LogoPlatform[]) {
	const cached = platformIndexes.get(platforms)
	if (cached) return cached
	const index = new Map<string, LogoPlatform>()
	for (const platform of platforms) {
		index.set(normalizePlatform(platform.name), platform)
		index.set(normalizePlatform(platform.domain), platform)
	}
	for (const platform of platforms) {
		for (const domain of [platform.domain, ...platform.additionalDomains]) {
			for (const alias of [domain, domain.replace(/^www\./, '').split('.')[0]]) {
				const key = normalizePlatform(alias)
				if (!index.has(key)) index.set(key, platform)
			}
		}
	}
	platformIndexes.set(platforms, index)
	return index
}

export function matchLogoPlatform(value: string, platforms: LogoPlatform[]): LogoPlatform | undefined {
	const index = getPlatformIndex(platforms)
	const match = index.get(normalizePlatform(value.replace(/(?:-icon)?\.(?:svg|png)$/i, '')))
	if (match) return match
	try {
		const hostname = new URL(value).hostname.replace(/^www\./, '')
		return index.get(normalizePlatform(hostname))
	} catch {
		return undefined
	}
}

export function getLogoSources(issuer: string, logo: string | undefined, platforms: LogoPlatform[]): string[] {
	const isLegacyLogo = !!logo && IMAGE_FILENAME.test(logo)
	if (logo && !isLegacyLogo && !DOMAIN.test(logo)) return []
	const platform = (logo ? matchLogoPlatform(logo, platforms) : undefined) || matchLogoPlatform(issuer, platforms)
	const localLogo = matchLocalLogo(logo || issuer)
		|| (platform ? matchLocalLogo(platform.name) : undefined)
		|| (isLegacyLogo ? `/logos/${logo}` : undefined)
	if (!platform && localLogo) return [localLogo]
	const image = platform?.image || (logo && !isLegacyLogo ? `${logo}.svg` : undefined)
	const path = image ? `${image.charAt(0).toLowerCase()}/${image}` : undefined
	const sources = path ? [`${IMAGE_BASE_URL}/${path}`, `${IMAGE_FALLBACK_URL}/${path}`] : []
	if (localLogo) sources.push(localLogo)
	return sources
}
