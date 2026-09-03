import React, { useContext, useRef, useState, useEffect, useCallback } from 'react'
import { assets } from '../assets/assets'
import { PlayerContext } from '../context/PlayerContext'

const Player = () => {
    const { 
        audioRef,
        track, 
        seekBar, 
        seekBg, 
        playStatus, 
        play, 
        pause, 
        time, 
        setTime,
        previous, 
        next, 
        volume,
        adjustVolume,
        isScrubbing
    } = useContext(PlayerContext)

    const volumeBg = useRef(null)
    const [isDraggingVolume, setIsDraggingVolume] = useState(false)
    const [isDraggingSeek, setIsDraggingSeek] = useState(false)

    // Stores the scrub target percentage (0 to 1) without touching audioRef.current.currentTime immediately
    const pendingSeekRatio = useRef(null)
    const prevVolumeRef = useRef(volume > 0 ? volume : 1)

    const toggleMute = () => {
        if (volume > 0) {
            prevVolumeRef.current = volume
            adjustVolume(0)
        } else {
            adjustVolume(prevVolumeRef.current || 1)
        }
    }

    // --- Volume Drag Logic ---
    const updateVolumeFromEvent = useCallback((clientX) => {
        if (!volumeBg.current) return
        const rect = volumeBg.current.getBoundingClientRect()
        const clickPosition = clientX - rect.left
        const newVolume = Math.max(0, Math.min(1, clickPosition / rect.width))

        if (newVolume > 0) {
            prevVolumeRef.current = newVolume
        }
        adjustVolume(newVolume)
    }, [adjustVolume])

    const handleVolumeMouseDown = (e) => {
        setIsDraggingVolume(true)
        updateVolumeFromEvent(e.clientX)
    }

    // --- Visual-Only Seek Drag Logic ---
    const updateSeekVisuals = useCallback((clientX) => {
        if (!seekBg.current || !audioRef.current || !audioRef.current.duration) return
        const rect = seekBg.current.getBoundingClientRect()
        const clickPosition = clientX - rect.left
        const ratio = Math.max(0, Math.min(1, clickPosition / rect.width))
        
        pendingSeekRatio.current = ratio

        // 1. Immediately move the progress bar width with the cursor
        if (seekBar.current) {
            seekBar.current.style.width = `${ratio * 100}%`
        }

        // 2. Immediately update the numbers to preview the time
        const previewTime = ratio * audioRef.current.duration
        setTime(prev => ({
            ...prev,
            currentTime: {
                second: Math.floor(previewTime % 60),
                minute: Math.floor(previewTime / 60)
            }
        }))
    }, [audioRef, seekBg, seekBar, setTime])

    const handleSeekMouseDown = (e) => {
        isScrubbing.current = true
        setIsDraggingSeek(true)
        updateSeekVisuals(e.clientX)
    }

    // --- Global Window Listeners ---
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDraggingVolume) {
                updateVolumeFromEvent(e.clientX)
            }
            if (isDraggingSeek) {
                updateSeekVisuals(e.clientX)
            }
        }

        const handleMouseUp = () => {
            if (isDraggingVolume) {
                setIsDraggingVolume(false)
            }

            // Commit the audio jump ONLY upon releasing mouse
            if (isDraggingSeek) {
                if (pendingSeekRatio.current !== null && audioRef.current && audioRef.current.duration) {
                    audioRef.current.currentTime = pendingSeekRatio.current * audioRef.current.duration
                    pendingSeekRatio.current = null
                }
                setIsDraggingSeek(false)
                isScrubbing.current = false
            }
        }

        if (isDraggingVolume || isDraggingSeek) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDraggingVolume, isDraggingSeek, updateVolumeFromEvent, updateSeekVisuals, audioRef])

    return track ? (
        <div className="h-[10%] min-h-[70px] bg-black flex justify-between items-center text-white px-2 sm:px-4 select-none gap-2">
            {/* Left section: track info */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 max-w-[25%] sm:max-w-[200px]">
                <img className="w-8 sm:w-12 h-8 sm:h-12 rounded object-cover flex-shrink-0" src={track.image} alt="" />
                <div className="min-w-0 overflow-hidden">
                    <p
                        className={`text-xs sm:text-sm font-semibold leading-tight ${
                            playStatus ? 'animage-marquee' : 'truncate'
                        }`}
                    >
                        {track.name}
                    </p>
                    <p
                        className={`text-[10px] sm:text-xs text-gray-400 leading-tight ${
                            playStatus ? 'animate-marquee' : 'truncate'
                        }`}
                    >
                        {track.desc}
                    </p>
                </div>
            </div>

            {/* Center section: controls & draggable seekbar */}
            <div className="flex flex-col items-center gap-1 flex-1 max-w-[480px] px-1">
                <div className="flex items-center gap-3 sm:gap-4">
                    <img className="w-3 sm:w-4 cursor-pointer hidden xs:block" src={assets.shuffle_icon} alt="" />
                    <img onClick={previous} className="w-3.5 sm:w-4 cursor-pointer" src={assets.prev_icon} alt="" />
                    {playStatus
                        ? <img onClick={pause} className="w-4 sm:w-5 cursor-pointer" src={assets.pause_icon} alt="" />
                        : <img onClick={play} className="w-4 sm:w-5 cursor-pointer" src={assets.play_icon} alt="" />}
                    <img onClick={next} className="w-3.5 sm:w-4 cursor-pointer" src={assets.next_icon} alt="" />
                    <img className="w-3 sm:w-4 cursor-pointer hidden xs:block" src={assets.loop_icon} alt="" />
                </div>
                <div className="w-full flex items-center justify-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-400 font-mono">
                    <p>{String(time.currentTime.minute).padStart(2, '0')}:{String(time.currentTime.second).padStart(2, '0')}</p>
                    
                    {/* Draggable Track Progress Bar */}
                    <div 
                        ref={seekBg} 
                        onMouseDown={handleSeekMouseDown} 
                        className="flex-1 max-w-[360px] py-2 -my-2 flex items-center cursor-pointer"
                    >
                        <div className="w-full bg-gray-600 h-1 rounded-full overflow-hidden">
                            <hr ref={seekBar} className="h-full border-none w-0 bg-green-600 rounded-full pointer-events-none" />
                        </div>
                    </div>

                    <p>{String(time.totalTime.minute).padStart(2, '0')}:{String(time.totalTime.second).padStart(2, '0')}</p>
                </div>
            </div>

            {/* Right section: utility icons & draggable volume bar */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <img className="w-4 hidden lg:block opacity-75" src={assets.plays_icon} alt="" />
                <img className="w-4 hidden lg:block opacity-75" src={assets.mic_icon} alt="" />
                <img className="w-4 hidden lg:block opacity-75" src={assets.queue_icon} alt="" />
                <img className="w-4 hidden lg:block opacity-75" src={assets.speaker_icon} alt="" />

                <img
                    onClick={toggleMute}
                    className="w-3.5 sm:w-4 opacity-85 cursor-pointer select-none"
                    src={volume === 0 ? (assets.volume_mute || assets.volume_icon) : assets.volume_icon}
                    alt="Volume toggle" />
                
                <div 
                    ref={volumeBg} 
                    onMouseDown={handleVolumeMouseDown}
                    className="w-12 sm:w-20 py-2 -my-2 flex items-center cursor-pointer relative"
                >
                    <div className="w-full bg-gray-600 h-1 rounded-full overflow-hidden">
                        <div 
                            style={{ width: `${volume * 100}%` }} 
                            className="bg-white h-full pointer-events-none"
                        />
                    </div>
                </div>

                <img className="w-4 hidden lg:block opacity-75" src={assets.mini_player_icon} alt="" />
                <img className="w-4 hidden lg:block opacity-75" src={assets.zoom_icon} alt="" />
            </div>
        </div>
    ) : null
}

export default Player