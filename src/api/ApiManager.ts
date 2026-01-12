import CapRoverAPI from 'caprover-api'
import Logger from '../utils/Logger'
import StorageHelper from '../utils/StorageHelper'

const BASE_DOMAIN = process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace(/\/$/, '')
    : ''
const URL = BASE_DOMAIN
Logger.dev(`API URL: ${URL}`)

const authProvider = {
    authToken: StorageHelper.getAuthKeyFromStorage() || '',
    hadEnteredOtp: false as boolean,
    lastKnownPassword: '' as string,
    onAuthTokenRequested: () => {
        return Promise.resolve(authProvider.authToken)
    },
    onCredentialsRequested: () => {
        return ApiManager.getCreds()
    },
    onAuthTokenUpdated: (authToken: string) => {
        authProvider.authToken = authToken
        if (authToken) {
            StorageHelper.setAuthKeyInLocalStorage(authToken)
        }
    },
}

export default class ApiManager extends CapRoverAPI {
    constructor() {
        super(URL, authProvider)
    }

    static getCreds() {
        ApiManager.clearAuthKeys()
        setTimeout(() => {
            window.location.href = window.location.href.split('#')[0]
        }, 200)

        return Promise.resolve({
            password: '',
            otpToken: '',
        })
    }

    getApiBaseUrl() {
        return URL
    }

    static clearAuthKeys() {
        authProvider.authToken = ''
        StorageHelper.clearAuthKeys()
    }

    static isLoggedIn(): boolean {
        return !!authProvider.authToken
    }

    loginAndSavePassword(
        username: string,
        password: string,
        otpToken?: string
    ) {
        authProvider.hadEnteredOtp = !!otpToken
        authProvider.lastKnownPassword = password

        return this.loginWithUsername(username, password, otpToken)
            .then(() => {
                return authProvider.authToken
            })
            .catch(function (error) {
                authProvider.hadEnteredOtp = false
                authProvider.lastKnownPassword = ''

                return Promise.reject(error)
            })
    }

    loginWithUsername(username: string, password: string, otpToken?: string) {
        const self = this
        return fetch(`${URL}/api/v2/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username || undefined,
                password,
                otpToken: otpToken || undefined,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.status === 100 && data.data?.token) {
                    authProvider.authToken = data.data.token
                    StorageHelper.setAuthKeyInLocalStorage(data.data.token)
                    return data
                }
                const error: any = new Error(data.description || 'Login failed')
                error.captainStatus = data.status
                throw error
            })
    }
}
