import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  getMultiFactorResolver,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier
} from 'firebase/auth'
import { auth } from '../../firebase'

const Login = () => {
  const navigate = useNavigate()

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 2FA modal states
  const [showMfaModal, setShowMfaModal] = useState(false)
  const [mfaResolver, setMfaResolver] = useState(null)
  const [mfaVerificationId, setMfaVerificationId] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaPhoneHint, setMfaPhoneHint] = useState('')

  // reCAPTCHA setup for MFA verification
  const setupRecaptcha = () => {
    if (window.loginRecaptchaVerifier) {
      return window.loginRecaptchaVerifier
    }

    const container = document.getElementById('login-recaptcha-container')
    if (!container) return null
    container.innerHTML = ''

    window.loginRecaptchaVerifier = new RecaptchaVerifier(auth, 'login-recaptcha-container', {
      size: 'invisible'
    })
    return window.loginRecaptchaVerifier
  }

  // Handle standard login and intercept 2FA
  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/')
    } catch (err) {
      if (err.code === 'auth/multi-factor-auth-required') {
        try {
          const resolver = getMultiFactorResolver(auth, err)
          setMfaResolver(resolver)

          // Select the first enrolled phone factor
          const phoneHint = resolver.hints[0]
          setMfaPhoneHint(phoneHint.phoneNumber || 'registered phone')

          const phoneAuthProvider = new PhoneAuthProvider(auth)
          const verifier = setupRecaptcha()

          const phoneInfoOptions = {
            multiFactorHint: phoneHint,
            session: resolver.session
          }

          const vId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, verifier)
          setMfaVerificationId(vId)
          setShowMfaModal(true)
        } catch (mfaErr) {
          if (window.loginRecaptchaVerifier) {
            try {
              window.loginRecaptchaVerifier.clear()
            } catch (clearErr) {
              console.error(clearErr)
            }
            window.loginRecaptchaVerifier = null
          }
          setError(mfaErr.message.replace('Firebase: ', ''))
        }
      } else {
        setError(err.message.replace('Firebase: ', ''))
      }
    } finally {
      setLoading(false)
    }
  }

  // Finalize 2FA code submission
  const handleMfaSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const cred = PhoneAuthProvider.credential(mfaVerificationId, mfaCode)
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred)

      await mfaResolver.resolveSignIn(multiFactorAssertion)
      
      // Clean up verifier
      if (window.loginRecaptchaVerifier) {
        try {
          window.loginRecaptchaVerifier.clear()
        } catch (clearErr) {
          console.error(clearErr)
        }
        window.loginRecaptchaVerifier = null
      }

      setShowMfaModal(false)
      navigate('/')
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    } finally {
      setLoading(false)
    }
  }

  // Google Sign In
  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)
    const provider = new GoogleAuthProvider()

    try {
      await signInWithPopup(auth, provider)
      navigate('/')
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      {/* Invisible reCAPTCHA Anchor */}
      <div id="login-recaptcha-container"></div>

      <div className="max-w-md w-full bg-[#121212] border border-[#282828] rounded-2xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Log in to Valley One</h1>
          <p className="text-xs text-zinc-400 mt-1">Welcome back! Please enter your details.</p>
        </div>

        {error && !showMfaModal && (
          <div className="p-3 bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#242424] border border-[#3e3e3e] focus:border-white focus:outline-none text-white text-sm px-3.5 py-2.5 rounded transition-colors"
              placeholder="name@domain.com"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#242424] border border-[#3e3e3e] focus:border-white focus:outline-none text-white text-sm px-3.5 py-2.5 rounded transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-zinc-200 text-black text-xs font-bold py-3 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Signing In...' : 'Log In'}
          </button>
        </form>

        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-zinc-800"></div>
          <span className="px-3 text-xs text-zinc-500 uppercase">or</span>
          <div className="flex-1 border-t border-zinc-800"></div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#242424] hover:bg-[#2c2c2c] border border-zinc-700 text-white text-xs font-semibold py-2.5 rounded-full transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-xs text-zinc-400 mt-4">
          Don't have an account?{' '}
          <Link to="/signup" className="text-white hover:underline font-semibold">
            Sign up
          </Link>
        </p>
      </div>

      {/* 2FA Verification Code Modal */}
      {showMfaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#181818] border border-[#2e2e2e] rounded-2xl p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Two-Factor Authentication</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Enter the 6-digit security code sent to <span className="text-zinc-200 font-medium">{mfaPhoneHint}</span>.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  placeholder="123456"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="w-full bg-[#242424] border border-[#3e3e3e] focus:border-white focus:outline-none text-white text-center text-lg tracking-widest font-mono py-2.5 rounded transition-colors"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowMfaModal(false)
                    setMfaCode('')
                    setMfaResolver(null)
                  }}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || mfaCode.length < 6}
                  className="bg-white hover:bg-zinc-200 text-black text-xs font-bold px-5 py-2.5 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login