import React, { useContext } from 'react'
import Sidebar from './components/Sidebar'
import Player from './components/Player'
import Display from './components/Display'
import { PlayerContext } from './context/PlayerContext'

export const url = 'https://valley-one-backend.onrender.com'

const App = () => {
  const { audioRef, track } = useContext(PlayerContext)

  return (
    <div className='h-screen bg-black flex flex-col overflow-hidden'>
      {/* Upper area: fills 90% or remaining height above player */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        <Sidebar />
        <Display />
      </div>

      {/* Persistent player bar */}
      <Player />

      <audio ref={audioRef} src={track ? track.file : ""} preload="auto"></audio>
    </div>
  )
}

export default App