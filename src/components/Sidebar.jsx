import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { useSidebar } from '../context/SidebarContext'
import { auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { ADMIN_EMAIL } from './Navbar'

const Sidebar = () => {
  const navigate = useNavigate()
  const { isSidebarOpen, closeSidebar } = useSidebar()
  const [currentUser, setCurrentUser] = useState(null)

  // 1. Hooks moved inside the component body
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })
    // 2. Fixed clean-up callback
    return () => unsubscribe()
  }, [])

  const isAdmin = currentUser?.email?.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase()

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col justify-between bg-[#121212] p-3 text-white transition-transform duration-300 ease-in-out border-r border-[#282828] md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:w-20 lg:w-56'
        }`}
      >
        <div className="flex flex-col gap-3">
          {/* Mobile Close Button */}
          <div className="flex items-center justify-between px-2 pt-2 md:hidden">
            <span className="font-bold text-sm tracking-wide text-white">Valley One</span>
            <button
              onClick={closeSidebar}
              className="text-zinc-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Navigation Section */}
          <div className="bg-[#181818] rounded-xl p-3 flex flex-col gap-4 border border-[#282828]">
            <div
              onClick={() => {
                navigate('/')
                closeSidebar()
              }}
              className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <img className="w-5 h-5 opacity-80 shrink-0" src={assets.home_icon} alt="Home" />
              <p className="font-semibold text-sm md:hidden lg:inline">Home</p>
            </div>
            <div
              onClick={() => {
                navigate('/search')
                closeSidebar()
              }}
              className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <img className="w-5 h-5 opacity-80 shrink-0" src={assets.search_icon} alt="Search" />
              <p className="font-semibold text-sm md:hidden lg:inline">Search</p>
            </div>
          </div>

          {/* Library Section */}
          <div className="bg-[#181818] rounded-xl p-3 flex-1 flex flex-col gap-3 border border-[#282828]">
            <div className="flex items-center gap-3 p-2">
              <img className="w-5 h-5 opacity-80 shrink-0" src={assets.stack_icon} alt="Library" />
              <p className="font-semibold text-sm md:hidden lg:inline">Your Library</p>
            </div>

            <div className="p-3 bg-[#242424] rounded-lg flex flex-col items-start gap-1 md:hidden lg:flex">
              <h4 className="font-semibold text-xs">Create your first playlist</h4>
              <p className="font-light text-[11px] text-zinc-400">It's easy, we'll help you</p>
              <button className="px-3 py-1 bg-white text-black text-xs font-bold rounded-full mt-2 hover:scale-105 transition-transform">
                Create Playlist
              </button>
            </div>
          </div>
        </div>

        {/* Footer Admin Link */}
        {isAdmin && (
          <div className="p-2 border-t border-[#282828] text-center md:hidden lg:block">
            <a
              href="https://v1admin.garrettu.com"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Admin Portal ↗
            </a>
          </div>
        )}
      </aside>
    </>
  )
}

export default Sidebar