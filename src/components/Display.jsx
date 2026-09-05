import React, { useEffect, useRef, useContext } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import DisplayHome from './DisplayHome'
import DisplayAlbum from './DisplayAlbum'
import Navbar from './Navbar'
import { PlayerContext } from '../context/PlayerContext'
import Login from './Login'
import Signup from './Signup'
import Account from './Account'
import Settings from './Settings'

const Display = () => {
    const { albumsData } = useContext(PlayerContext)

    const displayRef = useRef()
    const location = useLocation()
    const isAlbum = location.pathname.includes("album")
    const albumId = isAlbum ? location.pathname.split('/').pop() : ""
    
    // Safe lookup with optional chaining
    const albumItem = albumsData?.find((x) => x._id == albumId)
    const bgColor = isAlbum && albumItem?.bgColor ? albumItem.bgColor : "#121212"

    useEffect(() => {
        if (isAlbum) {
            displayRef.current.style.background = `linear-gradient(${bgColor}, #121212)`
        } else {
            displayRef.current.style.background = `#121212`
        }
    }, [isAlbum, bgColor])

    return (
        <div 
            ref={displayRef} 
            className="w-full flex-1 h-full overflow-y-auto text-white flex flex-col"
        >
            {/* Sticky Top Navbar across the full width */}
            <header className="sticky top-0 z-30 w-full bg-[#121212]/90 backdrop-blur-md px-4 sm:px-8 py-3 border-b border-[#282828] pointer-events-auto">
                <Navbar />
            </header>

            {/* Full-width scrollable page view */}
            <main className="flex-1 w-full px-4 sm:px-8 py-6">
                <Routes>
                    <Route path="/" element={<DisplayHome />} />
                    <Route path="/album/:id" element={<DisplayAlbum album={albumItem} />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </main>
        </div>
    )
}

export default Display