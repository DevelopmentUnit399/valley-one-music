import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
    updateProfile,
    updateEmail,
    updatePassword,
    deleteUser,
    reauthenticateWithCredential,
    EmailAuthProvider,
    GoogleAuthProvider,
    reauthenticateWithPopup,
    multiFactor,
    PhoneAuthProvider,
    PhoneMultiFactorGenerator,
    RecaptchaVerifier
} from 'firebase/auth'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import { auth } from '../../firebase'

const Account = () => {
    const { currentUser, loading: authLoading } = useAuth()
    const navigate = useNavigate()

    // Form states
    const [displayName, setDisplayName] = useState(currentUser?.displayName || '')
    const [email, setEmail] = useState(currentUser?.email || '')
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmNewPassword, setConfirmNewPassword] = useState('')

    // Feedback states
    const [statusMsg, setStatusMsg] = useState({ type: '', text: '' })
    const [loading, setLoading] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('')

    // Reauth Modal State
    const [showReauthModal, setShowReauthModal] = useState(false)
    const [reauthPassword, setReauthPassword] = useState('')
    const [pendingAction, setPendingAction] = useState(null)

    // 2FA states
    const [enrolledFactors, setEnrolledFactors] = useState([])
    const [mfaStep, setMfaStep] = useState('idle') // 'idle' | 'input-phone' | 'input-code'
    const [phoneNumber, setPhoneNumber] = useState('')
    const [verificationCode, setVerificationCode] = useState('')
    const [verificationId, setVerificationId] = useState('')

    useEffect(() => {
        if (currentUser) {
            try {
                setEnrolledFactors(multiFactor(currentUser).enrolledFactors || [])
            } catch (err) {
                console.error("Error reading MFA factors:", err)
            }
            setDisplayName(currentUser.displayName || '')
            setEmail(currentUser.email || '')
        }
    }, [currentUser])

    const setupRecaptcha = () => {
        // 1. If an instance already exists, reuse it rather than re-mounting
        if (window.recaptchaVerifier) {
            return window.recaptchaVerifier
        }

        const container = document.getElementById('recaptcha-container')
        if (!container) return null

        // 2. Clear out any residual markup just in case
        container.innerHTML = ''

        // 3. Create a fresh instance
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible'
        })

        return window.recaptchaVerifier
    }

    const reauthenticate = async (passwordOverride = null) => {
        if (!currentUser) return false
        const providerId = currentUser.providerData[0]?.providerId

        if (providerId === 'google.com') {
            const provider = new GoogleAuthProvider()
            await reauthenticateWithPopup(currentUser, provider)
            return true
        } else if (providerId === 'password') {
            const passToUse = passwordOverride || currentPassword
            if (!passToUse) {
                throw new Error('Please enter your password to confirm.')
            }
            const credential = EmailAuthProvider.credential(currentUser.email, passToUse)
            await reauthenticateWithCredential(currentUser, credential)
            return true
        }
        return false
    }

    // Step 1: Send SMS code with stale credential interception
    const handleSendMfaCode = async (e) => {
        if (e) e.preventDefault()
        setStatusMsg({ type: '', text: '' })
        setLoading(true)

        try {
            setupRecaptcha()

            const sendCode = async () => {
                const session = await multiFactor(currentUser).getSession()
                const cleanedNumber = phoneNumber.replace(/[^\d+]/g, '')
                const phoneInfoOptions = {
                    phoneNumber: cleanedNumber,
                    session
                }

                const phoneAuthProvider = new PhoneAuthProvider(auth)
                return await phoneAuthProvider.verifyPhoneNumber(
                    phoneInfoOptions,
                    window.recaptchaVerifier
                )
            }

            try {
                const vId = await sendCode()
                setVerificationId(vId)
                setMfaStep('input-code')
                setStatusMsg({ type: 'success', text: `Verification code sent to ${phoneNumber}.` })
            } catch (authErr) {
                const isStale = 
                    authErr.code === 'auth/requires-recent-login' || 
                    authErr.message?.includes('CREDENTIAL_TOO_OLD') ||
                    authErr.customData?.message?.includes('CREDENTIAL_TOO_OLD')

                if (isStale) {
                    if (window.recaptchaVerifier) {
                        try {
                            window.recaptchaVerifier.clear()
                        } catch (clearErr) {
                            console.error(clearErr)
                        }
                        window.recaptchaVerifier = null
                    }

                    const isGoogle = currentUser?.providerData[0]?.providerId === 'google.com'
                    if (isGoogle) {
                        await reauthenticate()
                        setupRecaptcha()
                        const vId = await sendCode()
                        setVerificationId(vId)
                        setMfaStep('input-code')
                        setStatusMsg({ type: 'success', text: `Verification code sent to ${phoneNumber}.` })
                    } else {
                        setPendingAction(() => () => handleSendMfaCode())
                        setShowReauthModal(true)
                    }
                } else {
                    throw authErr
                }
            }
        } catch (err) {
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear()
                window.recaptchaVerifier = null
            }
            setStatusMsg({ type: 'error', text: err.message.replace('Firebase: ', '') })
        } finally {
            setLoading(false)
        }
    }

    const handleReauthSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setStatusMsg({ type: '', text: '' })

        try {
            await reauthenticate(reauthPassword)
            setShowReauthModal(false)
            setReauthPassword('')
            if (pendingAction) {
                const resumeAction = pendingAction
                setPendingAction(null)
                await resumeAction()
            }
        } catch (err) {
            setStatusMsg({ type: 'error', text: err.message.replace('Firebase: ', '') })
            setLoading(false)
        }
    }

    // Step 2: Finalize enrollment
    const handleEnrollMfa = async (e) => {
        e.preventDefault()
        setStatusMsg({ type: '', text: '' })
        setLoading(true)

        try {
            const cred = PhoneAuthProvider.credential(verificationId, verificationCode)
            const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred)

            await multiFactor(currentUser).enroll(multiFactorAssertion, 'Primary Phone')

            setEnrolledFactors(multiFactor(currentUser).enrolledFactors)
            setMfaStep('idle')
            setPhoneNumber('')
            setVerificationCode('')
            setStatusMsg({ type: 'success', text: 'Two-factor authentication successfully enabled!' })
        } catch (err) {
            setStatusMsg({ type: 'error', text: err.message.replace('Firebase: ', '') })
        } finally {
            setLoading(false)
        }
    }

    // Unenroll 2FA
    const handleUnenrollMfa = async (factorUid) => {
        setStatusMsg({ type: '', text: '' })
        setLoading(true)

        try {
            const factorToUnenroll = enrolledFactors.find((f) => f.uid === factorUid)
            await multiFactor(currentUser).unenroll(factorToUnenroll)
            setEnrolledFactors(multiFactor(currentUser).enrolledFactors)
            setStatusMsg({ type: 'success', text: '2FA has been disabled.' })
        } catch (err) {
            if (err.code === 'auth/requires-recent-login') {
                setPendingAction(() => () => handleUnenrollMfa(factorUid))
                setShowReauthModal(true)
            } else {
                setStatusMsg({ type: 'error', text: err.message.replace('Firebase: ', '') })
            }
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateName = async (e) => {
        e.preventDefault()
        setStatusMsg({ type: '', text: '' })
        setLoading(true)

        try {
            await updateProfile(currentUser, { displayName })
            setStatusMsg({ type: 'success', text: 'Display name updated successfully.' })
        } catch (err) {
            setStatusMsg({ type: 'error', text: err.message.replace('Firebase: ', '') })
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateEmail = async (e) => {
        e.preventDefault()
        setStatusMsg({ type: '', text: '' })
        setLoading(true)

        try {
            await updateEmail(currentUser, email)
            setStatusMsg({ type: 'success', text: 'Email updated successfully. Verification may be required.' })
        } catch (err) {
            if (err.code === 'auth/requires-recent-login') {
                const isGoogle = currentUser?.providerData[0]?.providerId === 'google.com'
                if (isGoogle) {
                    try {
                        await reauthenticate()
                        await updateEmail(currentUser, email)
                        setStatusMsg({ type: 'success', text: 'Email updated successfully.' })
                    } catch (reAuthErr) {
                        setStatusMsg({ type: 'error', text: reAuthErr.message.replace('Firebase: ', '') })
                    }
                } else {
                    setPendingAction(() => () => handleUpdateEmail(e))
                    setShowReauthModal(true)
                }
            } else {
                setStatusMsg({ type: 'error', text: err.message.replace('Firebase: ', '') })
            }
        } finally {
            setLoading(false)
        }
    }

    const handleUpdatePassword = async (e) => {
        e.preventDefault()
        setStatusMsg({ type: '', text: '' })

        if (newPassword !== confirmNewPassword) {
            return setStatusMsg({ type: 'error', text: 'New passwords do not match.' })
        }
        if (newPassword.length < 6) {
            return setStatusMsg({ type: 'error', text: 'Password must be at least 6 characters.' })
        }

        setLoading(true)

        try {
            await reauthenticate()
            await updatePassword(currentUser, newPassword)
            setStatusMsg({ type: 'success', text: 'Password updated successfully.' })
            setCurrentPassword('')
            setNewPassword('')
            setConfirmNewPassword('')
        } catch (err) {
            if (err.code === 'auth/requires-recent-login') {
                setPendingAction(() => () => handleUpdatePassword(e))
                setShowReauthModal(true)
            } else {
                setStatusMsg({ type: 'error', text: err.message.replace('Firebase: ', '') })
            }
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteAccount = async () => {
        setStatusMsg({ type: '', text: '' })
        setLoading(true)

        try {
            await reauthenticate()
            await deleteUser(currentUser)
            setShowDeleteModal(false)
            navigate('/')
        } catch (err) {
            if (err.code === 'auth/requires-recent-login') {
                setShowDeleteModal(false)
                setPendingAction(() => () => handleDeleteAccount())
                setShowReauthModal(true)
            } else {
                setStatusMsg({ type: 'error', text: err.message.replace('Firebase: ', '') })
            }
        } finally {
            setLoading(false)
        }
    }

    const isGoogleUser = currentUser?.providerData[0]?.providerId === 'google.com'

    return (
        <div className="w-full h-full flex flex-col overflow-y-auto pb-12">
            <Navbar />

            <div className="max-w-3xl w-full mx-auto px-6 py-6 space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Account Overview</h1>
                    <p className="text-sm text-zinc-400 mt-1">Manage your profile credentials and security settings.</p>
                </div>

                {authLoading ? (
                    <div className="w-full h-48 bg-[#181818] border border-[#282828] rounded-xl animate-pulse" />
                ) : !currentUser ? (
                    <div className="bg-[#181818] border border-[#282828] rounded-xl p-8 sm:p-12 text-center flex flex-col items-center justify-center">
                        <div className="w-14 h-14 bg-zinc-800 text-zinc-400 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Sign in to view account details</h2>
                        <p className="text-xs text-zinc-400 max-w-sm mb-6">
                            You need an active session to review your personal credentials, manage your profile, and configure security.
                        </p>
                        <div className="flex items-center gap-3">
                            <Link
                                to="/login"
                                className="bg-white hover:bg-zinc-200 text-black text-xs font-bold px-6 py-2.5 rounded-full transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                            >
                                Log In
                            </Link>
                            <Link
                                to="/signup"
                                className="border border-zinc-600 hover:border-white text-white text-xs font-semibold px-6 py-2.5 rounded-full transition-colors cursor-pointer"
                            >
                                Create Account
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        {statusMsg.text && (
                            <div
                                className={`p-4 rounded-lg text-xs font-semibold ${
                                    statusMsg.type === 'success'
                                        ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-400'
                                        : 'bg-red-500/10 border border-red-500/40 text-red-400'
                                }`}
                            >
                                {statusMsg.text}
                            </div>
                        )}

                        {/* Profile Details Form */}
                        <section className="bg-[#181818] border border-[#282828] rounded-xl p-6">
                            <h2 className="text-lg font-bold text-white mb-4">Profile Information</h2>
                            <form onSubmit={handleUpdateName} className="space-y-4 max-w-md">
                                <div>
                                    <label className="text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                                        <span>Display Name</span>
                                        <span className="text-[11px] font-normal text-zinc-400">
                                            Current: <span className="text-zinc-200">{currentUser.displayName || 'None'}</span>
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full bg-[#242424] border border-[#3e3e3e] focus:border-white focus:outline-none text-white text-sm px-3.5 py-2.5 rounded transition-colors"
                                        placeholder="Display Name"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-white hover:bg-zinc-200 text-black text-xs font-bold px-4 py-2 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    Save Name
                                </button>
                            </form>
                        </section>

                        {/* Email Form */}
                        <section className="bg-[#181818] border border-[#282828] rounded-xl p-6">
                            <h2 className="text-lg font-bold text-white mb-4">Email Address</h2>
                            <form onSubmit={handleUpdateEmail} className="space-y-4 max-w-md">
                                <div>
                                    <label className="text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                                        <span>Registered Email</span>
                                        <span className="text-[11px] font-normal text-zinc-400">
                                            Current: <span className="text-zinc-200">{currentUser.email || 'None'}</span>
                                        </span>
                                    </label>
                                    <input
                                        type="email"
                                        disabled={isGoogleUser}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-[#242424] border border-[#3e3e3e] focus:border-white focus:outline-none text-white text-sm px-3.5 py-2.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    />
                                    {isGoogleUser && (
                                        <p className="text-[11px] text-zinc-500 mt-1">
                                            Managed by Google Auth. Email changes must be made via your Google Account.
                                        </p>
                                    )}
                                </div>
                                {!isGoogleUser && (
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-white hover:bg-zinc-200 text-black text-xs font-bold px-4 py-2 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                        Update Email
                                    </button>
                                )}
                            </form>
                        </section>

                        {/* Password Management */}
                        {!isGoogleUser && (
                            <section className="bg-[#181818] border border-[#282828] rounded-xl p-6">
                                <h2 className="text-lg font-bold text-white mb-4">Change Password</h2>
                                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Current Password</label>
                                        <input
                                            type="password"
                                            required
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-[#242424] border border-[#3e3e3e] focus:border-white focus:outline-none text-white text-sm px-3.5 py-2.5 rounded transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-zinc-300 block mb-1.5">New Password</label>
                                        <input
                                            type="password"
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-[#242424] border border-[#3e3e3e] focus:border-white focus:outline-none text-white text-sm px-3.5 py-2.5 rounded transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Confirm New Password</label>
                                        <input
                                            type="password"
                                            required
                                            value={confirmNewPassword}
                                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-[#242424] border border-[#3e3e3e] focus:border-white focus:outline-none text-white text-sm px-3.5 py-2.5 rounded transition-colors"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-white hover:bg-zinc-200 text-black text-xs font-bold px-4 py-2 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                        Change Password
                                    </button>
                                </form>
                            </section>
                        )}

                        {/* Multi-Factor Authentication (2FA) */}
                        <section className="bg-[#181818] border border-[#282828] rounded-xl p-6">
                            <div id="recaptcha-container"></div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-white">Two-Factor Authentication (2FA)</h2>
                                    <p className="text-xs text-zinc-400 mt-1">
                                        Protect your account with SMS-based two-factor verification.
                                    </p>
                                </div>
                                <span
                                    className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${
                                        enrolledFactors.length > 0
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                    }`}
                                >
                                    {enrolledFactors.length > 0 ? 'Enabled' : 'Not Configured'}
                                </span>
                            </div>

                            <div className="mt-4 pt-4 border-t border-[#282828]">
                                {enrolledFactors.length > 0 ? (
                                    <div className="space-y-3">
                                        {enrolledFactors.map((factor) => (
                                            <div
                                                key={factor.uid}
                                                className="flex items-center justify-between bg-[#242424] p-3 rounded border border-[#333]"
                                            >
                                                <div>
                                                    <p className="text-xs font-semibold text-white">{factor.displayName || 'SMS Device'}</p>
                                                    <p className="text-[11px] text-zinc-400">{factor.phoneNumber}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleUnenrollMfa(factor.uid)}
                                                    disabled={loading}
                                                    className="text-xs text-red-400 hover:text-red-300 font-semibold px-3 py-1.5 rounded transition-colors disabled:opacity-50 cursor-pointer"
                                                >
                                                    Disable
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : mfaStep === 'idle' ? (
                                    <button
                                        onClick={() => setMfaStep('input-phone')}
                                        className="text-xs font-semibold text-black bg-white hover:bg-zinc-200 px-4 py-2 rounded-full transition-colors cursor-pointer"
                                    >
                                        Set up 2FA
                                    </button>
                                ) : mfaStep === 'input-phone' ? (
                                    <form onSubmit={handleSendMfaCode} className="space-y-3 max-w-sm">
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-300 block mb-1">
                                                Phone Number (Include country code)
                                            </label>
                                            <input
                                                type="tel"
                                                required
                                                placeholder="+1 555 123 4567"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                className="w-full bg-[#242424] border border-[#3e3e3e] focus:border-white focus:outline-none text-white text-sm px-3.5 py-2 rounded transition-colors"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="bg-white hover:bg-zinc-200 text-black text-xs font-bold px-4 py-2 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
                                            >
                                                {loading ? 'Sending Code...' : 'Send SMS Code'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMfaStep('idle')}
                                                className="text-xs text-zinc-400 hover:text-white px-3 py-2 transition-colors cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <form onSubmit={handleEnrollMfa} className="space-y-3 max-w-sm">
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-300 block mb-1">
                                                Enter 6-Digit SMS Code
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="123456"
                                                value={verificationCode}
                                                onChange={(e) => setVerificationCode(e.target.value)}
                                                className="w-full bg-[#242424] border border-[#3e3e3e] focus:border-white focus:outline-none text-white text-sm px-3.5 py-2 rounded tracking-widest transition-colors font-mono"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="bg-white hover:bg-zinc-200 text-black text-xs font-bold px-4 py-2 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
                                            >
                                                {loading ? 'Enrolling...' : 'Verify & Enable'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMfaStep('input-phone')}
                                                className="text-xs text-zinc-400 hover:text-white px-3 py-2 transition-colors cursor-pointer"
                                            >
                                                Back
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            <p className="text-[10px] text-zinc-500 mt-3 leading-relaxed">
                                This site is protected by reCAPTCHA and the Google{' '}
                                <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-zinc-400 underline">
                                    Privacy Policy
                                </a>{' '}
                                and{' '}
                                <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="text-zinc-400 underline">
                                    Terms of Service
                                </a>
                            </p>
                        </section>

                        {/* Destructive Section */}
                        <section className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                            <h2 className="text-lg font-bold text-red-400">Danger Zone</h2>
                            <p className="text-xs text-zinc-400 mt-1 max-w-lg">
                                Permanently delete your account, listening history, and personal playlists. This action cannot be undone.
                            </p>
                            <div className="mt-4">
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors cursor-pointer"
                                >
                                    Delete Account
                                </button>
                            </div>
                        </section>
                    </>
                )}
            </div>

            {/* Quick Re-authentication Modal */}
            {showReauthModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-[#181818] border border-[#2e2e2e] rounded-2xl p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-2">Confirm Your Password</h3>
                        <p className="text-xs text-zinc-400 mb-4">
                            For security, please enter your password before making sensitive account changes.
                        </p>

                        <form onSubmit={handleReauthSubmit} className="space-y-4">
                            <input
                                type="password"
                                required
                                autoFocus
                                value={reauthPassword}
                                onChange={(e) => setReauthPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-[#242424] border border-[#3e3e3e] focus:border-white focus:outline-none text-white text-sm px-3.5 py-2.5 rounded"
                            />

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowReauthModal(false)
                                        setReauthPassword('')
                                        setPendingAction(null)
                                    }}
                                    className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-white hover:bg-zinc-200 text-black text-xs font-bold px-4 py-2 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {loading ? 'Verifying...' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-[#181818] border border-[#2e2e2e] rounded-2xl p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-2">Delete Account</h3>
                        <p className="text-xs text-zinc-400 mb-4">
                            Type <span className="font-bold text-white select-none">DELETE</span> to confirm the removal of your account.
                        </p>

                        <input
                            type="text"
                            value={deleteConfirmInput}
                            onChange={(e) => setDeleteConfirmInput(e.target.value)}
                            placeholder="DELETE"
                            className="w-full bg-[#242424] border border-[#3e3e3e] focus:border-red-500 focus:outline-none text-white text-sm px-3.5 py-2.5 rounded mb-4"
                        />

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false)
                                    setDeleteConfirmInput('')
                                }}
                                className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmInput !== 'DELETE' || loading}
                                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {loading ? 'Deleting...' : 'Permanently Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Account