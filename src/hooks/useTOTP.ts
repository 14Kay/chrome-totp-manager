import { useState, useEffect, useRef } from 'react'
import { getTOTPCode, getRemainingSeconds } from '@/lib/totp'

export function useTOTP(secret: string) {
	const [code, setCode] = useState(() => getTOTPCode(secret))
	const [remaining, setRemaining] = useState(() => getRemainingSeconds())
	const periodRef = useRef(Math.floor(Date.now() / 1000 / 30))

	useEffect(() => {
		const interval = setInterval(() => {
			const newRemaining = getRemainingSeconds()
			setRemaining(newRemaining)
			const newPeriod = Math.floor(Date.now() / 1000 / 30)
			if (newPeriod !== periodRef.current) {
				periodRef.current = newPeriod
				setCode(getTOTPCode(secret))
			}
		}, 1000)

		return () => clearInterval(interval)
	}, [secret])

	return { code, remaining }
}
