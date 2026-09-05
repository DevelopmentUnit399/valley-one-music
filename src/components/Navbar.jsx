import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { useSidebar } from '../context/SidebarContext'
import { auth } from '../firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'

const ADMIN_EMAIL = 'garrettuichanco@att.net'

const Navbar = () => {
    const navigate = useNavigate()
    const { toggleSidebar } = useSidebar()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    const menuRef = useRef(null)

    // Listen to Firebase auth state in real-time
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user)
        })
        return () => unsubscribe()
    }, [])

    // Check if the authenticated user's email matches the admin email
    const userEmail = currentUser?.email || ''
    const isAdmin = userEmail.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase()

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleNavigate = (path) => {
        navigate(path)
        setIsMenuOpen(false)
    }

    const handleLogout = async () => {
        try {
            await signOut(auth)
            handleNavigate('/login')
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    return (
        <div className="w-full flex justify-between items-center font-semibold relative">
            <div className="flex items-center gap-3">
                {/* 🍔 Mobile Hamburger Icon */}
                <button
                    onClick={toggleSidebar}
                    type="button"
                    aria-label="Toggle Sidebar"
                    className="flex md:hidden p-2 rounded-full bg-black/60 hover:bg-zinc-800 text-white cursor-pointer border border-[#282828] transition-colors"
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                {/* Arrow Navigation */}
                <div className="flex items-center gap-2">
                    <img
                        onClick={() => navigate(-1)}
                        className="w-8 bg-black p-2 rounded-2xl cursor-pointer hover:bg-zinc-900 transition-colors"
                        src={assets.arrow_left}
                        alt="Back"
                    />
                    <img
                        onClick={() => navigate(1)}
                        className="w-8 bg-black p-2 rounded-2xl cursor-pointer hover:bg-zinc-900 transition-colors"
                        src={assets.arrow_right}
                        alt="Forward"
                    />
                </div>
            </div>

            {/* Profile Avatar & Dropdown */}
            <div className="relative flex items-center gap-2" ref={menuRef}>
                {/* 🛡️ Admin Badge (displays only when admin user is authenticated) */}
                {isAdmin && (
                    <a 
                        href="https://v1admin.garrettu.com"
                        target="_blank"
                        rel="noreferrer"
                        title="Open Admin Portal"
                        className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-2 py-0.5 rounded-full select-none"
                    >
                        <svg 
                            className="w-3.5 h-3.5 text-emerald-400" 
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                        >
                            <path 
                                fillRule="evenodd" 
                                d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" 
                                clipRule="evenodd" 
                            />
                        </svg>
                        <span className="hidden sm:inline">Admin</span>
                    </a>
                )}

                {/* Profile Circle Button */}
                <button
                    onClick={() => setIsMenuOpen((prev) => !prev)}
                    type="button"
                    className="bg-purple-500 hover:bg-purple-400 text-black w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer shadow-md transition-transform hover:scale-105 active:scale-95"
                    aria-label="User menu"
                >
                    {userEmail ? userEmail.charAt(0).toUpperCase() : 'G'}
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                    <div className="absolute right-0 top-11 w-52 bg-[#282828] border border-[#3e3e3e] rounded-xl shadow-2xl py-1.5 z-50 text-sm animate-in fade-in zoom-in-95 duration-100">
                        <button
                            onClick={() => handleNavigate('/account')}
                            className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-white flex items-center justify-between transition-colors cursor-pointer"
                        >
                            <span>Account</span>
                            <span className="text-xs text-zinc-400">↗</span>
                        </button>

                        <button
                            onClick={() => handleNavigate('/settings')}
                            className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-white transition-colors cursor-pointer"
                        >
                            Settings
                        </button>

                        <a
                            href="https://support.garrettu.com"
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => setIsMenuOpen(false)}
                            className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-white flex items-center justify-between transition-colors cursor-pointer"
                        >
                            <span>Support</span>
                            <span className="text-xs text-zinc-400">↗</span>
                        </a>

                        {/* 🔒 Protected Admin Portal Link */}
                        {isAdmin && (
                            <>
                                <div className="my-1 border-t border-[#3e3e3e]" />
                                <a
                                    href="https://v1admin.garrettu.com"
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-emerald-400 font-semibold flex items-center justify-between transition-colors cursor-pointer"
                                >
                                    <span>Admin Portal</span>
                                    <span className="text-xs">↗</span>
                                </a>
                            </>
                        )}

                        <div className="my-1 border-t border-[#3e3e3e]" />

                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2.5 hover:bg-red-500/10 text-red-400 transition-colors cursor-pointer font-medium"
                        >
                            Log out
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Navbar