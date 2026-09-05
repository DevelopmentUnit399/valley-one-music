import React, { useContext } from 'react'
import Navbar from './Navbar'
import AlbumItem from './AlbumItem'
import SongItem from './SongItem'
import { PlayerContext } from '../context/PlayerContext'
import CardSkeleton from './CardSkeleton'

const DisplayHome = () => {
    const { songsData, albumsData } = useContext(PlayerContext)

    const skeletonArray = Array(6).fill(0)

  return (
    <>
        <div className="mb-4">
            <h1 className="my-5 font-bold text-2xl">Featured Albums</h1>
            <div className="flex overflow-x-auto no-scrollbar gap-4">
                {albumsData && albumsData.length > 0
                    ? [...albumsData].reverse().map((item, index) => (
                        <AlbumItem
                            key={item._id || index}
                            name={item.name}
                            desc={item.desc}
                            id={item._id}
                            image={item.image}
                        />
                    ))
                : skeletonArray.map((_, index) => (
                    <CardSkeleton key={index} />
                ))}
            </div>
        </div>
        <div className="mb-4">
            <h1 className="my-5 font-bold text-2xl">Recent Songs</h1>
            <div className="flex overflow-x-auto no-scrollbar gap-4">
                {songsData && songsData.length > 0
                    ? [...songsData].reverse().map((item, index) => (
                        <SongItem
                            key={item._id || index}
                            name={item.name}
                            desc={item.desc}
                            id={item._id}
                            image={item.image}
                        />
                    ))
                : skeletonArray.map((_, index) => (
                    <CardSkeleton key={index} />
                ))}
            </div>
        </div>
    </>
  )
}

export default DisplayHome