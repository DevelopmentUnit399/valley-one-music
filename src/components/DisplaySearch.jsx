import React, { useState, useEffect, useContext, useRef } from 'react'
import { PlayerContext } from '../context/PlayerContext'
import SongItem from './SongItem'
import AlbumItem from './AlbumItem'
import { assets } from '../assets/assets'
import { auth, db } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const DisplaySearch = () => {
    const { songsData, albumsData } = useContext(PlayerContext)
    const [searchTerm, setSearchTerm] = useState('')
    const [activeFilter, setActiveFilter] = useState('all')
    const [recentSearches, setRecentSearches] = useState([])
    const [isFocused, setIsFocused] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    const searchContainerRef = useRef(null)

    // Listen for Firebase auth state & load searches from Firestore
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user)
            if (user) {
                try {
                    const userDocRef = doc(db, 'users', user.uid)
                    const docSnap = await getDoc(userDocRef)
                    if (docSnap.exists() && docSnap.data().recentSearches) {
                        setRecentSearches(docSnap.data().recentSearches)
                    }
                } catch (error) {
                    console.error('Error fetching search history:', error)
                }
            } else {
                setRecentSearches([])
            }
        })
        return () => unsubscribe()
    }, [])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
                setIsFocused(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Save query to Firestore (max 10, newest first)
    const saveSearchQuery = async (query) => {
        const trimmed = query.trim()
        if (!trimmed || !currentUser) return

        const updated = [trimmed, ...recentSearches.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 10)
        setRecentSearches(updated)

        try {
            const userDocRef = doc(db, 'users', currentUser.uid)
            await setDoc(userDocRef, { recentSearches: updated }, { merge: true })
        } catch (error) {
            console.error('Error saving search to Firestore:', error)
        }
    }

    const removeSearchItem = async (e, itemToRemove) => {
        e.stopPropagation()
        const updated = recentSearches.filter((item) => item !== itemToRemove)
        setRecentSearches(updated)

        if (currentUser) {
            try {
                const userDocRef = doc(db, 'users', currentUser.uid)
                await setDoc(userDocRef, { recentSearches: updated }, { merge: true })
            } catch (error) {
                console.error('Error removing item from Firestore:', error)
            }
        }
    }

    const clearAllSearches = async (e) => {
        e.stopPropagation()
        setRecentSearches([])
        if (currentUser) {
            try {
                const userDocRef = doc(db, 'users', currentUser.uid)
                await setDoc(userDocRef, { recentSearches: [] }, { merge: true })
            } catch (error) {
                console.error('Error clearing searches:', error)
            }
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            saveSearchQuery(searchTerm)
            setIsFocused(false)
        }
    }

    const handleSelectRecommendation = (query) => {
        setSearchTerm(query)
        saveSearchQuery(query)
        setIsFocused(false)
    }

    // Filtering logic
    const query = searchTerm.toLowerCase().trim()

    const filteredSongs = songsData ? songsData.filter((song) => {
        if (!query) return true
        return (
            song.name?.toLowerCase().includes(query) ||
            song.album?.toLowerCase().includes(query) ||
            song.desc?.toLowerCase().includes(query)
        )
    }) : []

    const filteredAlbums = albumsData ? albumsData.filter((album) => {
        if (!query) return true
        return (
            album.name?.toLowerCase().includes(query) ||
            album.desc?.toLowerCase().includes(query)
        )
    }) : []

    const showSongs = (activeFilter === 'all' || activeFilter === 'songs') && filteredSongs.length > 0
    const showAlbums = (activeFilter === 'all' || activeFilter === 'albums') && filteredAlbums.length > 0
    const hasResults = showSongs || showAlbums

    return (
        <div className="w-full flex flex-col gap-6">
            {/* Search Input Bar with Recommendations */}
            <div className="relative max-w-xl w-full" ref={searchContainerRef}>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <img 
                            src={assets.search_icon} 
                            alt="Search" 
                            className="w-4 h-4 opacity-50" 
                        />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onFocus={() => setIsFocused(true)}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search songs, albums, or artists..."
                        className="w-full pl-10 pr-10 py-3 bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#242424] border border-[#333333] focus:border-emerald-500 rounded-full text-sm text-white placeholder-zinc-400 outline-none transition-all"
                        autoFocus
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-white text-sm cursor-pointer"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Recommendations Dropdown */}
                {isFocused && recentSearches.length > 0 && (
                    <div className="absolute left-0 right-0 top-12 mt-1 bg-[#181818] border border-[#282828] rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="flex items-center justify-between px-3 py-1.5 text-xs text-zinc-400 font-semibold border-b border-[#282828] mb-1">
                            <span>Recent Searches</span>
                            <button
                                onClick={clearAllSearches}
                                className="text-zinc-500 hover:text-red-400 transition-colors cursor-pointer text-[11px]"
                            >
                                Clear all
                            </button>
                        </div>
                        <div className="flex flex-col">
                            {recentSearches.map((item, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleSelectRecommendation(item)}
                                    className="flex items-center justify-between px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <svg className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-sm text-zinc-200 group-hover:text-white font-medium truncate">
                                            {item}
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => removeSearchItem(e, item)}
                                        className="text-zinc-500 hover:text-white p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                        activeFilter === 'all'
                            ? 'bg-white text-black'
                            : 'bg-[#242424] text-zinc-300 hover:bg-[#2e2e2e]'
                    }`}
                >
                    All
                </button>
                <button
                    onClick={() => setActiveFilter('songs')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                        activeFilter === 'songs'
                            ? 'bg-white text-black'
                            : 'bg-[#242424] text-zinc-300 hover:bg-[#2e2e2e]'
                    }`}
                >
                    Songs ({filteredSongs.length})
                </button>
                <button
                    onClick={() => setActiveFilter('albums')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                        activeFilter === 'albums'
                            ? 'bg-white text-black'
                            : 'bg-[#242424] text-zinc-300 hover:bg-[#2e2e2e]'
                    }`}
                >
                    Albums ({filteredAlbums.length})
                </button>
            </div>

            {/* Results Display */}
            {hasResults ? (
                <div className="flex flex-col gap-8">
                    {/* Songs Section */}
                    {showSongs && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-bold text-white">Songs</h3>
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                        Track
                                    </span>
                                </div>
                                <span className="text-xs text-zinc-400">{filteredSongs.length} found</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {filteredSongs.map((item) => (
                                    <div key={item._id} className="relative group">
                                        <span className="absolute top-2 left-2 z-10 text-[9px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-sm text-zinc-300 px-1.5 py-0.5 rounded border border-white/10 pointer-events-none">
                                            Song
                                        </span>
                                        <SongItem
                                            name={item.name}
                                            desc={item.desc}
                                            id={item._id}
                                            image={item.image}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Albums Section */}
                    {showAlbums && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-bold text-white">Albums</h3>
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/25">
                                        Collection
                                    </span>
                                </div>
                                <span className="text-xs text-zinc-400">{filteredAlbums.length} found</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {filteredAlbums.map((item) => (
                                    <div key={item._id} className="relative group">
                                        <span className="absolute top-2 left-2 z-10 text-[9px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-sm text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20 pointer-events-none">
                                            Album
                                        </span>
                                        <AlbumItem
                                            name={item.name}
                                            desc={item.desc}
                                            id={item._id}
                                            image={item.image}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
                    <p className="text-lg font-semibold text-white">No results found for "{searchTerm}"</p>
                    <p className="text-xs text-zinc-400 max-w-sm">
                        Please check your spelling or try different keywords for titles, album names, or descriptions.
                    </p>
                </div>
            )}
        </div>
    )
}

export default DisplaySearch