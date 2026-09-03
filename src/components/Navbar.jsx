import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendEmailVerification } from 'firebase/auth'
import { useAuth } from '../context/AuthContext'
import { assets } from '../assets/assets'

const Navbar = () => {
  const { currentUser, logout, loading } = useAuth()
  const navigate = useNavigate()
  const [resending, setResending] = useState(false)
  const [resentSuccess, setResentSuccess] = useState(false)

  const userInitial = currentUser?.displayName
    ? currentUser.displayName.trim()[0].toUpperCase()
    : currentUser?.email
    ? currentUser.email.trim()[0].toUpperCase()
    : 'U'

  const handleResendVerification = async () => {
    if (!currentUser || resending) return
    try {
      setResending(true)
      await sendEmailVerification(currentUser)
      setResentSuccess(true)
      setTimeout(() => setResentSuccess(false), 4000)
    } catch (err) {
      console.error('Failed to resend verification:', err)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="w-full flex justify-between items-center font-semibold px-4 py-3">
      {/* Left: Navigation Arrows */}
      <div className="flex items-center gap-2">
        <img 
          onClick={() => navigate(-1)} 
          className="w-8 bg-black p-2 rounded-2xl cursor-pointer" 
          src={assets.arrow_left} 
          alt="Back" 
        />
        <img 
          onClick={() => navigate(1)} 
          className="w-8 bg-black p-2 rounded-2xl cursor-pointer" 
          src={assets.arrow_right} 
          alt="Forward" 
        />
      </div>

      {/* Right: Auth State */}
      <div className="flex items-center gap-4">
        {loading ? (
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-zinc-800" />
            <div className="w-20 h-7 rounded-full bg-zinc-800" />
          </div>
        ) : currentUser ? (
          <div className="flex items-center gap-3">
            {/* Unverified Email Warning Badge */}
            {!currentUser.emailVerified && (
              <div className="relative group flex items-center">
                <button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer"
                  title="Click to resend verification email"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="hidden md:inline">
                    {resentSuccess ? 'Sent!' : resending ? 'Sending...' : 'Verify Email'}
                  </span>
                </button>

                {/* Hover Tooltip for small screens */}
                <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 w-48 p-2 text-xs bg-zinc-900 border border-zinc-700 text-zinc-300 rounded shadow-xl pointer-events-none md:hidden">
                  {resentSuccess ? 'Email sent! Check your inbox.' : 'Email unverified. Tap to resend link.'}
                </div>
              </div>
            )}

            {/* User Avatar */}
            <div 
              title={currentUser.email}
              className="bg-purple-500 text-black w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer select-none"
            >
              {userInitial}
            </div>

            {/* Log Out */}
            <button 
              onClick={logout}
              className="text-xs bg-zinc-800 text-white hover:bg-zinc-700 px-3 py-1.5 rounded-full cursor-pointer transition-colors"
            >
              Log Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <p 
              onClick={() => navigate('/signup')} 
              className="text-gray-400 text-[15px] cursor-pointer hover:text-white"
            >
              Sign up
            </p>
            <p 
              onClick={() => navigate('/login')} 
              className="bg-white text-black text-[15px] px-4 py-1.5 rounded-2xl cursor-pointer"
            >
              Log in
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Navbar