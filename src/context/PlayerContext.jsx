import { createContext, useEffect, useRef, useState, useCallback } from "react";
import { useSettings } from './SettingsContext'
import axios from 'axios'

export const PlayerContext = createContext()

const PlayerContextProvider = (props) => {
    const audioRefA = useRef()
    const audioRefB = useRef()
    const activePlayerRef = useRef('A') // 'A' | 'B'

    const seekBg = useRef()
    const seekBar = useRef()

    const { settings } = useSettings()
    const url = 'https://valley-one-backend.onrender.com'

    const [songsData, setSongsData] = useState([])
    const [albumsData, setAlbumsData] = useState([])
    const [track, setTrack] = useState(null)
    const [playStatus, setPlayStatus] = useState(false)
    const [volume, setVolume] = useState(1)
    const [loading, setLoading] = useState(true)

    const isScrubbing = useRef(false)
    const isFadingRef = useRef(false)
    const crossfadeIntervalRef = useRef(null)

    const [time, setTime] = useState({
        currentTime: { second: '00', minute: 0 },
        totalTime: { second: '00', minute: 0 }
    })

    // Determine preload mode dynamically: Low/Normal throttles data usage, High pre-caches
    const preloadMode = (settings?.streamingQuality === 'low' || settings?.streamingQuality === 'normal') 
        ? 'metadata' 
        : 'auto'

    const getActiveAudio = useCallback(() => {
        return activePlayerRef.current === 'A' ? audioRefA.current : audioRefB.current
    }, [])

    const getInactiveAudio = useCallback(() => {
        return activePlayerRef.current === 'A' ? audioRefB.current : audioRefA.current
    }, [])

    const getTargetVolume = useCallback((baseVol = volume) => {
        return settings?.normalizeVolume ? baseVol * 0.75 : baseVol
    }, [volume, settings?.normalizeVolume])

    const adjustVolume = (newVolume) => {
        const clamped = Math.max(0, Math.min(1, newVolume))
        setVolume(clamped)
        const activeAudio = getActiveAudio()
        if (activeAudio && !isFadingRef.current) {
            activeAudio.volume = getTargetVolume(clamped)
        }
    }

    const play = () => {
        const activeAudio = getActiveAudio()
        if (activeAudio) {
            activeAudio.play().catch(err => console.error("Playback error:", err))
            setPlayStatus(true)
        }
    }

    const pause = () => {
        const activeAudio = getActiveAudio()
        if (activeAudio) {
            activeAudio.pause()
            setPlayStatus(false)
        }
    }

    const clearCrossfade = () => {
        if (crossfadeIntervalRef.current) {
            clearInterval(crossfadeIntervalRef.current)
            crossfadeIntervalRef.current = null
        }
        isFadingRef.current = false
    }

    const switchTrackDirect = (newTrack) => {
        clearCrossfade()
        const activeAudio = getActiveAudio()
        const inactiveAudio = getInactiveAudio()

        if (inactiveAudio) {
            inactiveAudio.pause()
            inactiveAudio.currentTime = 0
        }

        setTrack(newTrack)
        setPlayStatus(true)

        if (activeAudio) {
            activeAudio.src = newTrack.file
            activeAudio.volume = getTargetVolume()
            activeAudio.currentTime = 0
            activeAudio.load()
            activeAudio.play().catch(err => console.error(err))
        }
    }

    const playWithId = (id) => {
        const selected = songsData.find(item => item._id === id)
        if (selected) switchTrackDirect(selected)
    }

    const previous = () => {
        const currentIndex = songsData.findIndex(item => track?._id === item._id)
        if (currentIndex > 0) {
            switchTrackDirect(songsData[currentIndex - 1])
        }
    }

    const next = () => {
        const currentIndex = songsData.findIndex(item => track?._id === item._id)
        if (currentIndex !== -1 && currentIndex < songsData.length - 1) {
            switchTrackDirect(songsData[currentIndex + 1])
        }
    }

    const seekSong = async (e) => {
        const activeAudio = getActiveAudio()
        if (activeAudio && seekBg.current && activeAudio.duration) {
            activeAudio.currentTime = (e.nativeEvent.offsetX / seekBg.current.offsetWidth) * activeAudio.duration
        }
    }

    const seekToRatio = (ratio) => {
        const activeAudio = getActiveAudio()
        if (activeAudio && activeAudio.duration) {
            activeAudio.currentTime = Math.max(0, Math.min(1, ratio)) * activeAudio.duration
        }
    }

    const startCrossfadeTransition = useCallback((nextTrack, fadeDuration) => {
        if (isFadingRef.current) return
        isFadingRef.current = true

        const outgoingAudio = getActiveAudio()
        const incomingAudio = getInactiveAudio()
        if (!outgoingAudio || !incomingAudio) return

        incomingAudio.src = nextTrack.file
        incomingAudio.currentTime = 0
        incomingAudio.volume = 0
        incomingAudio.load()

        incomingAudio.play().then(() => {
            const stepTimeMs = 50
            const totalSteps = (fadeDuration * 1000) / stepTimeMs
            let currentStep = 0
            const maxVolume = getTargetVolume()

            crossfadeIntervalRef.current = setInterval(() => {
                currentStep++
                const progress = currentStep / totalSteps

                outgoingAudio.volume = Math.max(0, maxVolume * (1 - progress))
                incomingAudio.volume = Math.min(maxVolume, maxVolume * progress)

                if (currentStep >= totalSteps) {
                    clearCrossfade()
                    outgoingAudio.pause()
                    outgoingAudio.currentTime = 0
                    outgoingAudio.volume = maxVolume

                    activePlayerRef.current = activePlayerRef.current === 'A' ? 'B' : 'A'
                    setTrack(nextTrack)
                }
            }, stepTimeMs)
        }).catch(err => {
            console.error("Crossfade incoming play failed:", err)
            clearCrossfade()
        })
    }, [getActiveAudio, getInactiveAudio, getTargetVolume])

    const handleTimeUpdate = (playerKey) => {
        if (playerKey !== activePlayerRef.current) return
        const activeAudio = getActiveAudio()
        if (!activeAudio || isScrubbing.current || !activeAudio.duration) return

        if (seekBar.current) {
            seekBar.current.style.width = `${Math.floor((activeAudio.currentTime / activeAudio.duration) * 100)}%`
        }

        setTime({
            currentTime: {
                second: Math.floor(activeAudio.currentTime % 60),
                minute: Math.floor(activeAudio.currentTime / 60)
            },
            totalTime: {
                second: Math.floor(activeAudio.duration % 60),
                minute: Math.floor(activeAudio.duration / 60)
            }
        })

        const crossfadeSec = Number(settings?.crossfade) || 0
        const remainingTime = activeAudio.duration - activeAudio.currentTime

        if (crossfadeSec > 0 && remainingTime <= crossfadeSec && !isFadingRef.current) {
            const currentIndex = songsData.findIndex(item => track?._id === item._id)
            if (currentIndex !== -1 && currentIndex < songsData.length - 1) {
                startCrossfadeTransition(songsData[currentIndex + 1], crossfadeSec)
            }
        }
    }

    const handleAudioEnded = (playerKey) => {
        if (playerKey !== activePlayerRef.current) return
        if (isFadingRef.current) return

        const currentIndex = songsData.findIndex(item => track?._id === item._id)
        const hasNext = currentIndex !== -1 && currentIndex < songsData.length - 1

        if (settings?.autoplay && hasNext) {
            next()
        } else {
            const activeAudio = getActiveAudio()
            if (activeAudio) {
                activeAudio.pause()
                activeAudio.currentTime = 0
            }
            setPlayStatus(false)
            if (seekBar.current) seekBar.current.style.width = '0%'
            setTime(prev => ({ ...prev, currentTime: { second: 0, minute: 0 } }))
        }
    }

    const getSongsData = async () => {
        try {
            const response = await axios.get(`${url}/api/song/list`)
            const songs = response.data.songs || []
            setSongsData(songs)
            if (songs.length > 0) {
                setTrack(songs[0])
                if (audioRefA.current) {
                    audioRefA.current.src = songs[0].file
                }
            }
            setLoading(false)
        } catch (error) {
            console.error("Error fetching songs:", error)
            setLoading(false)
        }
    }

    const getAlbumsData = async () => {
        try {
            const response = await axios.get(`${url}/api/album/list`)
            setAlbumsData(response.data.albums || [])
        } catch (error) {
            console.error("Error fetching albums:", error)
        }
    }

    useEffect(() => {
        getSongsData()
        getAlbumsData()
    }, [])

    const contextValue = {
        audioRef: {
            get current() {
                return getActiveAudio()
            },
            set current(_) {
                // Safe no-op to allow React or external assignment without crashing
            }
        },
        getActiveAudio,
        seekToRatio,
        seekBg,
        seekBar,
        track,
        setTrack,
        playStatus,
        setPlayStatus,
        time,
        setTime,
        play,
        pause,
        playWithId,
        previous,
        next,
        seekSong,
        songsData,
        albumsData,
        volume,
        adjustVolume,
        isScrubbing,
        loading
    }

    return (
        <PlayerContext.Provider value={contextValue}>
            {props.children}
            <audio
                ref={audioRefA}
                preload={preloadMode}
                onTimeUpdate={() => handleTimeUpdate('A')}
                onEnded={() => handleAudioEnded('A')}
            />
            <audio
                ref={audioRefB}
                preload={preloadMode}
                onTimeUpdate={() => handleTimeUpdate('B')}
                onEnded={() => handleAudioEnded('B')}
            />
        </PlayerContext.Provider>
    )
}

export default PlayerContextProvider