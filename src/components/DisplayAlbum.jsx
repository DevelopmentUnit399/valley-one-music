import React, { useContext } from 'react'
import Navbar from './Navbar'
import { useParams } from 'react-router-dom'
import { PlayerContext } from '../context/PlayerContext'
import { assets } from '../assets/assets'

const DisplayAlbum = ({ album }) => {
    const { id } = useParams()
    const { playWithId, songsData, albumsData } = useContext(PlayerContext)

    // Fallback if album prop wasn't resolved yet
    const albumData = album || albumsData?.find((item) => item._id === id)

    // Filter all songs belonging to this album
    const albumSongs = songsData?.filter((song) => song.album === albumData?.name) || []

    // Calculate total duration across all tracks in the album
    const calculateTotalDuration = () => {
        let totalSeconds = 0
        albumSongs.forEach((song) => {
            if (song.duration) {
                const parts = song.duration.split(':').map(Number)
                if (parts.length === 2) {
                    totalSeconds += (parts[0] * 60) + parts[1]
                } else if (parts.length === 3) {
                    totalSeconds += (parts[0] * 3600) + (parts[1] * 60) + parts[2]
                }
            }
        })

        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60

        if (hours > 0) {
            return `${hours} hr ${minutes} min`
        }
        return `${minutes} min ${seconds > 0 ? `${seconds} sec` : ''}`.trim()
    }

    if (!albumData) {
        return null
    }

    return (
        <>
            <div className="mt-10 flex gap-8 flex-col md:flex-row md:items-end">
                <img className="w-48 rounded shadow-2xl" src={albumData.image} alt={albumData.name} />
                <div className="flex flex-col">
                    <p className="text-xs uppercase font-bold text-zinc-300">Album</p>
                    <h2 className="text-5xl font-extrabold mb-4 md:text-7xl">{albumData.name}</h2>
                    <p className="text-sm text-zinc-300 mb-2">{albumData.desc}</p>
                    <p className="mt-1 text-xs text-zinc-400 flex items-center gap-2">
                        <img 
                            src={assets.v1_logo_icon} 
                            alt="Valley One" 
                            className="w-5 h-5 inline-block object-contain" 
                        />
                        <span className="font-bold text-white">Valley One Worship</span>
                        <span className="font-bold text-white">•</span>
                        <span className="font-bold text-white">{albumSongs.length} songs</span>
                        {albumSongs.length > 0 && (
                            <>
                                <span className="font-bold text-white">•</span>
                                <span className="font-bold text-white">about {calculateTotalDuration()}</span>
                            </>
                        )}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 mt-10 mb-4 pl-2 text-[#a7a7a7] text-sm">
                <p><b className="mr-4">#</b>Title</p>
                <p>Album</p>
                <p className="hidden sm:block">Date Added</p>
                <img className="m-auto w-4" src={assets.clock_icon} alt="Duration" />
            </div>
            <hr className="border-[#ffffff26]" />

            {albumSongs.map((item, index) => (
                <div
                    onClick={() => playWithId(item._id)}
                    key={item._id || index}
                    className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 p-2 items-center text-[#a7a7a7] hover:bg-[#ffffff2b] cursor-pointer rounded transition-colors"
                >
                    <p className="text-white flex items-center">
                        <b className="mr-4 text-[#a7a7a7]">{index + 1}</b>
                        <img className="inline w-10 h-10 object-cover mr-5 rounded" src={item.image} alt={item.name} />
                        <span className="truncate">{item.name}</span>
                    </p>
                    <p className="text-[15px] truncate">{albumData.name}</p>
                    <p className="text-[15px] hidden sm:block">5 days ago</p>
                    <p className="text-[15px] text-center">{item.duration}</p>
                </div>
            ))}
        </>
    )
}

export default DisplayAlbum