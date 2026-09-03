import React from 'react'

const CardSkeleton = () => {
  return (
    <div className="min-w-[180px] p-2 px-3 rounded cursor-pointer animate-pulse">
        {/* Thumbnail placeholder */}
        <div className="w-full aspect-square rounded bg-zinc-800 mb-3" />
        {/* Title placeholder */}
        <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2" />
        {/* Subtitle/Description placeholder */}
        <div className="h-3 bg-zinc-800/60 rounded w-1/2" />
    </div>
  )
}

export default CardSkeleton