import { useEffect, useSyncExternalStore } from 'react'
import { getLogoCatalog, loadLogoCatalog, retryLogoCatalog, subscribeLogoCatalog } from '@/lib/logos'

export function useLogoCatalog() {
	const catalog = useSyncExternalStore(subscribeLogoCatalog, getLogoCatalog)
	useEffect(() => { void loadLogoCatalog() }, [])
	return { ...catalog, retry: retryLogoCatalog }
}
