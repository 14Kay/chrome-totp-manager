export interface Account {
	id: string
	issuer: string
	account: string
	secret: string
	/** 2FA Directory service domain, or a legacy local logo filename. */
	logo?: string
}
