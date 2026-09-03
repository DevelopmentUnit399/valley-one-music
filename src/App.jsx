import React, { useContext } from 'react'
import Sidebar from './components/Sidebar'
import Player from './components/Player'
import Display from './components/Display'
import { PlayerContext } from './context/PlayerContext'
import Login from './components/Login'
import Signup from './components/Signup'

export const url = 'https://valley-one-backend.onrender.com'

const App = () => {

  const { audioRef, track, songsData } = useContext(PlayerContext)

  return (
    <div className='h-screen bg-black'>
        <div className="h-[90%] flex">
          <Sidebar />
          <Display />
        </div>
        <Player />
      <audio ref={audioRef} src={track ? track.file : ""} preload="auto"></audio>
    </div>
  )
}

export default App