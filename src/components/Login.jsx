import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '../../firebase'
import { assets } from '../assets/assets'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/')
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

  return (
    <div className="w-full min-h-full flex flex-col justify-center items-center p-4 sm:p-6 overflow-y-auto">
    <div className="w-full max-w-[420px] my-auto flex flex-col items-center">
      {/* Brand Header */}
      <div 
        onClick={() => navigate('/')} 
        className="flex items-center gap-2 mb-8 cursor-pointer select-none"
      >
        <img className="w-8" src={assets.v1_logo_icon} alt="Logo" />
        <span className="font-bold text-xl tracking-wide">Valley One Music</span>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[420px] bg-[#121212] p-8 rounded-xl border border-[#282828] shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-center">Log in to Valley One</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-xs p-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Google Quick Login */}
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
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-[1px] bg-[#282828]" />
          <span className="text-xs text-gray-500 font-semibold">OR</span>
          <div className="flex-1 h-[1px] bg-[#282828]" />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-300 mb-1.5 block">Email address</label>
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
            <label className="text-xs font-semibold text-gray-300 mb-1.5 block">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#242424] border border-[#3e3e3e] focus:border-white focus:outline-none text-white text-sm px-3.5 py-2.5 rounded hover:border-gray-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-2.5 rounded-full text-sm mt-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="text-xs text-center text-gray-400 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-white underline hover:text-green-500 ml-1">
            Sign up
          </Link>
        </p>
      </div>
    </div>
    </div>
  )
}

export default Login