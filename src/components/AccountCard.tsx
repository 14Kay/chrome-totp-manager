import { useState } from 'react'
import { useTOTP } from '@/hooks/useTOTP'
import { useLanguage } from '@/hooks/useLanguage'
import { useLogoCatalog } from '@/hooks/useLogoCatalog'
import { getLogoSources } from '@/lib/logos'
import { LogoImage } from './LogoImage'
import type { Account } from '@/types'

interface AccountCardProps {
	account: Account
	selectable?: boolean
	selected?: boolean
	onSelect?: (id: string) => void
	onCopy?: (issuer: string) => void
}

export function AccountCard({ account, selectable, selected, onSelect, onCopy }: AccountCardProps) {
	const { code, remaining } = useTOTP(account.secret)
	const { t } = useLanguage()
	const { platforms } = useLogoCatalog()
	const isLowTime = remaining <= 5
	const [failedLogos, setFailedLogos] = useState<string[]>([])
	const displayLogo = getLogoSources(account.issuer, account.logo, platforms).find(source => !failedLogos.includes(source))
	const [isPressed, setIsPressed] = useState(false)

	const handleCopy = () => {
		navigator.clipboard.writeText(code)
		onCopy?.(account.issuer)
	}

	const handleMouseDown = () => {
		setIsPressed(true)
	}

	const handleMouseUp = () => {
		setIsPressed(false)
	}

	const tooltipText = t('clickToCopy')
	const radius = 9
	const circumference = 2 * Math.PI * radius
	const offset = ((30 - remaining) / 30) * circumference

	return (
		<div className="flex items-center gap-3">
			{selectable && (
				<input
					type="checkbox"
					checked={selected}
					onChange={() => onSelect?.(account.id)}
					className="w-3 h-3 flex-shrink-0"
				/>
			)}
			<div className={`bg-white dark:bg-gray-800 rounded-md ${selectable ? 'p-1 py-2' : 'p-3'} flex-1 min-w-0 transition-transform duration-150 ${isPressed ? 'scale-95' : 'scale-100'}`}>

				{/* 顶部：Logo + 邮箱 (左) 和 倒计时 (右) */}
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2 flex-1 min-w-0">
						{displayLogo ? (
							<div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-white dark:bg-gray-700 p-1">
								<LogoImage
									key={displayLogo}
									src={displayLogo}
									alt={account.issuer}
									onError={() => setFailedLogos(previous => [...previous, displayLogo])}
								/>
							</div>
						) : (
							<div className="w-8 h-8 bg-[#fafafa] rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 dark:bg-gray-700">
								{account.issuer.charAt(0).toUpperCase()}
							</div>
						)}
						<div className="flex-1 min-w-0">
							<div className="text-xs truncate tracking-wide dark:text-white">{account.issuer}</div>
							<div className="text-[10px] text-gray-400 dark:text-gray-400 truncate tracking-wide">{account.account}</div>
						</div>
					</div>

					<div className="relative flex items-center justify-center flex-shrink-0">
						<svg width="26" height="26" className="transform -rotate-90">
							<circle
								cx="13"
								cy="13"
								r={radius}
								stroke="currentColor"
								strokeWidth="2"
								fill="none"
								className="text-gray-200 dark:text-gray-700"
							/>
							<circle
								cx="13"
								cy="13"
								r={radius}
								stroke="currentColor"
								strokeWidth="2"
								fill="none"
								strokeDasharray={circumference}
								strokeDashoffset={offset}
								className={`${isLowTime ? 'text-red-500' : 'text-blue-500'} transition-all duration-1000 ease-linear`}
								strokeLinecap="round"
								style={{
									willChange: 'stroke-dashoffset',
								}}
							/>
						</svg>
					</div>
				</div>

				{/* 验证码区域 */}
				<div
					onClick={handleCopy}
					onMouseDown={handleMouseDown}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseUp}
					className={`flex items-center justify-between cursor-pointer rounded-lg transition min-w-0 ${selectable ? 'gap-x-2' : 'gap-x-5'}`}
					title={tooltipText}
				>
					<div className="flex gap-1.5">
						{code.slice(0, 3).split('').map((digit, i) => (
							<div key={i} className="w-9 h-9 bg-[#E7F4FD] dark:bg-gray-700 rounded-lg flex items-center justify-center">
								<span className="text-lg font-bold text-[#1B7BCF] dark:text-blue-400">{digit}</span>
							</div>
						))}
					</div>
					<div className="flex gap-1.5">
						{code.slice(3, 6).split('').map((digit, i) => (
							<div key={i + 3} className="w-9 h-9 bg-[#E7F4FD] dark:bg-gray-700 rounded-lg flex items-center justify-center">
								<span className="text-lg font-bold text-[#1B7BCF] dark:text-blue-400">{digit}</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}
