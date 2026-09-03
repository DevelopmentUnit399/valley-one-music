import React, { useContext, useMemo, useState, useEffect } from 'react'
import Navbar from './Navbar'
import { useParams } from 'react-router-dom'
import { assets } from '../assets/assets'
import { PlayerContext } from '../context/PlayerContext'

// Helper to format single-digit seconds (e.g., 1:1 -> 1:01)
const formatDuration = (durationStr) => {
  if (!durationStr) return '0:00'
  const parts = durationStr.split(':')
  if (parts.length === 2) {
    const minutes = parts[0]
    const seconds = parts[1].padStart(2, '0')
    return `${minutes}:${seconds}`
  }
  return durationStr
}

const DisplayAlbum = ({ album }) => {
  const { id } = useParams()
  const [albumData, setAlbumData] = useState("")
  const { playWithId, albumsData, songsData } = useContext(PlayerContext)

  useEffect(() => {
    const foundAlbum = albumsData.find((item) => item._id === id)
    if (foundAlbum) {
      setAlbumData(foundAlbum)
    }
  }, [id, albumsData])

  // Filter songs belonging to this album
  const albumSongs = useMemo(() => {
    if (!albumData?.name) return []
    return songsData.filter((item) => item.album === albumData.name)
  }, [songsData, albumData])

  // Calculate dynamic total running time
  const totalDurationText = useMemo(() => {
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

    if (hours > 0) {
      return `about ${hours} hr ${minutes} min`
    }
    return `${minutes} min`
  }, [albumSongs])

  return albumData ? (
    <>
      <Navbar />
      <div className="mt-10 flex gap-8 flex-col md:flex-row md:items-end">
        <img className="w-48 rounded" src={albumData.image} alt="" />
        <div className="flex flex-col">
          <p>Playlist</p>
          <h2 className="text-5xl font-bold mb-4 md:text-7xl">{albumData.name}</h2>
          <h4>{albumData.desc}</h4>
          <p className="mt-1 flex flex-wrap items-center gap-1">
            <img className="inline-block w-5" src={assets.v1_logo_icon} alt="" />
            <b>Valley One Worship</b>
            <span>• 132,244,545 likes</span>
            <span>• <b>{albumSongs.length} {albumSongs.length === 1 ? 'song' : 'songs'},</b></span>
            <span>{totalDurationText}</span>
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 mt-10 mb-4 pl-2 text-[#a7a7a7]">
        <p><b className="mr-4">#</b>Title</p>
        <p>Album</p>
        <p className="hidden sm:block">Date Added</p>
        <img className="m-auto w-4" src={assets.clock_icon} alt="" />
      </div>
      <hr />
      {
        albumSongs.map((item, index) => (
          <div 
            onClick={() => playWithId(item._id)} 
            key={item._id || index} 
            className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2 items-center text-[#a7a7a7] hover:bg-[#ffffff2b] cursor-pointer"
          >
            <p className="text-white">
              <b className="mr-4 text-[#a7a7a7]">{index + 1}</b>
              <img className="inline w-10 mr-5" src={item.image} alt="" />
              {item.name}
            </p>
            <p className="text-[15px]">{albumData.name}</p>
            <p className="text-[15px] hidden sm:block">5 days ago</p>
            <p className="text-[15px] text-center">{formatDuration(item.duration)}</p>
          </div>
        ))
      }
    </>
  ) : null
}

export default DisplayAlbum