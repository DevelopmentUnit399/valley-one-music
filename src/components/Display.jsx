import React, { useEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import DisplayHome from './DisplayHome'
import DisplayAlbum from './DisplayAlbum'
import { useContext } from 'react'
import { PlayerContext } from '../context/PlayerContext'
import Login from './Login'
import Signup from './Signup'

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
        <div ref={displayRef} className="w-[100%] m-2 px-6 pt-4 rounded bg-[#121212] text-white overflow-auto lg:w-[75%] lg:ml-0">
            <Routes>
                <Route path="/" strict element={<DisplayHome />} />
                <Route path="/album/:id" element={<DisplayAlbum album={albumItem} />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
            </Routes>
        </div>
    )
}

export default Display