import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signInWithPopup, 
  GoogleAuthProvider,
  sendEmailVerification 
} from 'firebase/auth'
import { auth } from '../firebase'
import { assets } from '../assets/assets'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

export const DEFAULT_SETTINGS = {
  streamingQuality: 'high',
  crossfade: 0,
  autoplay: true,
  normalizeVolume: false,
  pushNotifications: true,
  emailDigest: true
}

const Signup = () => {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)

  const navigate = useNavigate()

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      return setError('Password should be at least 6 characters.')
    }

    if (password !== confirmPassword) {
      return setError('Passwords do not match.')
    }

    setLoading(true)

    try {
      // 1. Create the user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Seed Firestore preferences
      await setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), DEFAULT_SETTINGS)
      
      // 2. Set display name if provided
      if (displayName) {
        await updateProfile(userCredential.user, { displayName })
      }

      // 3. Send the email verification
      await sendEmailVerification(userCredential.user)

      // 4. Open the verification modal
      setShowVerifyModal(true)
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      navigate('/')
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    }
  }

  const handleModalClose = () => {
    setShowVerifyModal(false)
    navigate('/')
  }

  return (
    <div className="relative w-full min-h-full flex flex-col justify-center items-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-[420px] my-auto flex flex-col items-center">
        
        {/* Brand Header */}
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 mb-6 cursor-pointer select-none"
        >
          <img className="w-8" src={assets.v1_logo_icon} alt="Logo" />
          <span className="font-bold text-xl tracking-wide">Valley One Music</span>
        </div>

        {/* Signup Card */}
        <div className="w-full bg-[#121212] p-6 sm:p-8 rounded-xl border border-[#282828] shadow-2xl">
          <h2 className="text-2xl font-bold mb-2 text-center">Sign up for free</h2>
          <p className="text-xs text-gray-400 text-center mb-6">Create playlists and save your favorite tracks</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-xs p-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Google Quick Signup */}
          <button
            onClick={handleGoogleSignIn}
            type="button"
            className="w-full flex items-center justify-center gap-3 border border-gray-600 hover:border-white py-2.5 rounded-full text-sm font-semibold transition-all mb-5 hover:bg-white/5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign up with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-[1px] bg-[#282828]" />
            <span className="text-xs text-gray-500 font-semibold">OR</span>
            <div className="flex-1 h-[1px] bg-[#282828]" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1.5 block">What's your name?</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display Name"
                className="w-full bg-[#242424] border border-[#3e3e3e] focus:border-white focus:outline-none text-white text-sm px-3.5 py-2.5 rounded hover:border-gray-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1.5 block">What's your email?</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#242424] border border-[#3e3e3e] focus:border-white focus:outline-none text-white text-sm px-3.5 py-2.5 rounded hover:border-gray-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1.5 block">Create a password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#242424] border border-[#3e3e3e] focus:border-white focus:outline-none text-white text-sm px-3.5 py-2.5 rounded hover:border-gray-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1.5 block">Confirm your password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#242424] border border-[#3e3e3e] focus:border-white focus:outline-none text-white text-sm px-3.5 py-2.5 rounded hover:border-gray-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-2.5 rounded-full text-sm mt-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <p className="text-xs text-center text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-white underline hover:text-green-500 ml-1">
              Log in
            </Link>
          </p>
        </div>
      </div>

      {/* Verification Sent Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#181818] border border-[#2e2e2e] rounded-2xl p-6 text-center shadow-2xl animate-fade-in">
            <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Check Your Email</h3>
            <p className="text-sm text-gray-400 mb-6">
              We sent a verification link to <span className="text-white font-medium">{email}</span>. Click the link in the email to activate your account.
            </p>

            <button
              onClick={handleModalClose}
              className="w-full bg-white hover:bg-gray-200 text-black font-bold py-2.5 rounded-full text-sm transition-all cursor-pointer"
            >
              Continue to Home
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Signup