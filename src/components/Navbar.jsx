import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendEmailVerification } from 'firebase/auth'
import { useAuth } from '../context/AuthContext'
import { assets } from '../assets/assets'

const ADMIN_EMAILS = [
  'garrettuichanco@att.net',
  'garrettuichanco@gmail.com' // Added in case you log in via your Google account
]

const Navbar = () => {
  const { currentUser, logout, loading } = useAuth()
  const navigate = useNavigate()

  const [menuOpen, setMenuOpen] = useState(false)
  const [resending, setResending] = useState(false)
  const [resentSuccess, setResentSuccess] = useState(false)

  const dropdownRef = useRef(null)

  const isAdmin = currentUser && ADMIN_EMAILS.includes(currentUser.email)

  const userInitial = currentUser?.displayName
    ? currentUser.displayName.trim()[0].toUpperCase()
    : currentUser?.email
      ? currentUser.email.trim()[0].toUpperCase()
      : 'U'

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [menuOpen])

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

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/')
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

            {/* Admin Panel Link (Only visible to allowed emails) */}
            {isAdmin && (
              <a
                href="https://v1admin.garrettu.com"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Admin</span>
              </a>
            )}

            {/* User Avatar */}
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setMenuOpen((prev) => !prev)}
                className={`bg-purple-500 text-black w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer select-none transition-transform hover:scale-105 active:scale-95 ${menuOpen ? 'ring-2 ring-white/50' : ''
                  }`}
              >
                {userInitial}
              </div>

              {/* Styled Dropdown Menu */}
              {menuOpen && (
                <div className="absolute right-0 top-11 w-48 bg-[#282828] border border-[#3e3e3e] rounded-md shadow-2xl p-1 z-50 text-xs font-medium animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-[#3e3e3e]/60 mb-1">
                    <p className="font-semibold text-white truncate">{currentUser.displayName || 'User'}</p>
                    <p className="text-zinc-400 truncate text-[11px]">{currentUser.email}</p>
                  </div>

                  {/* Admin Option inside Dropdown */}
                  {isAdmin && (
                    <a
                      href="https://v1.garrettu.com"
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setMenuOpen(false)}
                      className="w-full text-left px-3 py-2 rounded text-emerald-400 hover:text-emerald-300 hover:bg-white/10 transition-colors flex items-center justify-between font-semibold"
                    >
                      Admin Panel
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      window.open('/account', '_blank', 'noopener,noreferrer')
                    }}
                    className="w-full text-left px-3 py-2 rounded text-zinc-200 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between"
                  >
                    Account
                    <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>

                  <button
                    onClick={() => { setMenuOpen(false); navigate('/support') }}
                    className="w-full text-left px-3 py-2 rounded text-zinc-200 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between"
                  >
                    Support
                    <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>

                  <button
                    onClick={() => { setMenuOpen(false); navigate('/settings') }}
                    className="w-full text-left px-3 py-2 rounded text-zinc-200 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Settings
                  </button>

                  <div className="h-[1px] bg-[#3e3e3e]/60 my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded text-zinc-200 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
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