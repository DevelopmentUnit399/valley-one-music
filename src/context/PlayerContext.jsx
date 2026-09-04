import { createContext, useEffect, useRef, useState, useCallback } from "react";
import { useSettings } from './SettingsContext'
import { useAuth } from './AuthContext'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import axios from 'axios'

export const PlayerContext = createContext()

const PlayerContextProvider = (props) => {
    const audioRefA = useRef()
    const audioRefB = useRef()
    const activePlayerRef = useRef('A') // 'A' | 'B'

    const seekBg = useRef()
    const seekBar = useRef()

    const { currentUser } = useAuth()
    const { settings } = useSettings()
    const url = 'https://valley-one-backend.onrender.com'

    const [songsData, setSongsData] = useState([])
    const [albumsData, setAlbumsData] = useState([])
    const [track, setTrack] = useState(null)
    const [playStatus, setPlayStatus] = useState(false)
    const [volume, setVolume] = useState(1)
    const [loading, setLoading] = useState(true)

    // Tracks if remote session has been restored to prevent overwriting on initial mount
    const hasRestoredRef = useRef(false)

    const isScrubbing = useRef(false)
    const isFadingRef = useRef(false)
    const crossfadeIntervalRef = useRef(null)

    const [time, setTime] = useState({
        currentTime: { second: '00', minute: 0 },
        totalTime: { second: '00', minute: 0 }
    })

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

    // --- Firestore Playback Sync Helpers ---
    const savePlaybackToFirestore = useCallback(async (songId, currentTime) => {
        if (!currentUser?.uid || !songId) return
        try {
            const playbackDocRef = doc(db, 'users', currentUser.uid, 'playback', 'current')
            await setDoc(playbackDocRef, {
                songId,
                currentTime: Math.floor(currentTime || 0),
                updatedAt: new Date().toISOString()
            }, { merge: true })
        } catch (err) {
            console.error("Error saving playback to Firestore:", err)
        }
    }, [currentUser])

    const saveCurrentPlaybackState = useCallback(() => {
        const activeAudio = getActiveAudio()
        if (activeAudio && track?._id && currentUser?.uid) {
            savePlaybackToFirestore(track._id, activeAudio.currentTime)
        }
    }, [getActiveAudio, track, currentUser, savePlaybackToFirestore])

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
            saveCurrentPlaybackState()
        }
    }

    const clearCrossfade = () => {
        if (crossfadeIntervalRef.current) {
            clearInterval(crossfadeIntervalRef.current)
            crossfadeIntervalRef.current = null
        }
        isFadingRef.current = false
    }

    const switchTrackDirect = (newTrack, startTime = 0, autoPlay = true) => {
        clearCrossfade()
        const activeAudio = getActiveAudio()
        const inactiveAudio = getInactiveAudio()

        if (inactiveAudio) {
            inactiveAudio.pause()
            inactiveAudio.currentTime = 0
        }

        setTrack(newTrack)
        setPlayStatus(autoPlay)

        if (activeAudio) {
            activeAudio.src = newTrack.file
            activeAudio.volume = getTargetVolume()
            activeAudio.load()

            const setTimeAndPlay = () => {
                activeAudio.currentTime = startTime
                if (autoPlay) {
                    activeAudio.play().catch(err => console.error(err))
                    savePlaybackToFirestore(newTrack._id, startTime)
                }
                activeAudio.removeEventListener('loadedmetadata', setTimeAndPlay)
            }

            activeAudio.addEventListener('loadedmetadata', setTimeAndPlay)
        }
    }

    const playWithId = (id) => {
        const selected = songsData.find(item => item._id === id)
        if (selected) switchTrackDirect(selected, 0, true)
    }

    const previous = () => {
        const currentIndex = songsData.findIndex(item => track?._id === item._id)
        if (currentIndex > 0) {
            switchTrackDirect(songsData[currentIndex - 1], 0, true)
        }
    }

    const next = () => {
        const currentIndex = songsData.findIndex(item => track?._id === item._id)
        if (currentIndex !== -1 && currentIndex < songsData.length - 1) {
            switchTrackDirect(songsData[currentIndex + 1], 0, true)
        }
    }

    const seekSong = async (e) => {
        const activeAudio = getActiveAudio()
        if (activeAudio && seekBg.current && activeAudio.duration) {
            const newTime = (e.nativeEvent.offsetX / seekBg.current.offsetWidth) * activeAudio.duration
            activeAudio.currentTime = newTime
            savePlaybackToFirestore(track?._id, newTime)
        }
    }

    const seekToRatio = (ratio) => {
        const activeAudio = getActiveAudio()
        if (activeAudio && activeAudio.duration) {
            const newTime = Math.max(0, Math.min(1, ratio)) * activeAudio.duration
            activeAudio.currentTime = newTime
            savePlaybackToFirestore(track?._id, newTime)
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
                    savePlaybackToFirestore(nextTrack._id, 0)
                }
            }, stepTimeMs)
        }).catch(err => {
            console.error("Crossfade incoming play failed:", err)
            clearCrossfade()
        })
    }, [getActiveAudio, getInactiveAudio, getTargetVolume, savePlaybackToFirestore])

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
            savePlaybackToFirestore(track?._id, 0)
        }
    }

    // Periodic sync: auto-saves the active timestamp every 5 seconds while playing
    useEffect(() => {
        if (!currentUser?.uid || !track?._id || !playStatus) return

        const interval = setInterval(() => {
            const activeAudio = getActiveAudio()
            if (activeAudio && !activeAudio.paused && !isScrubbing.current) {
                savePlaybackToFirestore(track._id, activeAudio.currentTime)
            }
        }, 5000)

        return () => clearInterval(interval)
    }, [currentUser, track, playStatus, getActiveAudio, savePlaybackToFirestore])

    // Window lifecycle sync: persists exact timestamp if tab is reloaded or closed
    useEffect(() => {
        const handleBeforeUnload = () => {
            saveCurrentPlaybackState()
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [saveCurrentPlaybackState])

    // Initial Data Fetching + Restore Firestore Session
    useEffect(() => {
        const initData = async () => {
            try {
                const [songsRes, albumsRes] = await Promise.all([
                    axios.get(`${url}/api/song/list`),
                    axios.get(`${url}/api/album/list`)
                ])

                const songs = songsRes.data.songs || []
                setSongsData(songs)
                setAlbumsData(albumsRes.data.albums || [])

                if (songs.length > 0) {
                    let songToLoad = songs[0]
                    let restoreSeconds = 0

                    // Check for saved Firestore state
                    if (currentUser?.uid && !hasRestoredRef.current) {
                        try {
                            const playbackDocRef = doc(db, 'users', currentUser.uid, 'playback', 'current')
                            const docSnap = await getDoc(playbackDocRef)

                            if (docSnap.exists()) {
                                const saved = docSnap.data()
                                const foundSong = songs.find(s => s._id === saved.songId)
                                if (foundSong) {
                                    songToLoad = foundSong
                                    restoreSeconds = Number(saved.currentTime) || 0
                                }
                            }
                        } catch (fireErr) {
                            console.error("Could not fetch remote playback position:", fireErr)
                        }
                        hasRestoredRef.current = true
                    }

                    // Mount the restored song in a paused state with progress initialized
                    setTrack(songToLoad)
                    if (audioRefA.current) {
                        audioRefA.current.src = songToLoad.file
                        audioRefA.current.load()

                        const onLoaded = () => {
                            audioRefA.current.currentTime = restoreSeconds
                            if (audioRefA.current.duration) {
                                setTime({
                                    currentTime: {
                                        second: Math.floor(restoreSeconds % 60),
                                        minute: Math.floor(restoreSeconds / 60)
                                    },
                                    totalTime: {
                                        second: Math.floor(audioRefA.current.duration % 60),
                                        minute: Math.floor(audioRefA.current.duration / 60)
                                    }
                                })
                                if (seekBar.current) {
                                    seekBar.current.style.width = `${Math.floor((restoreSeconds / audioRefA.current.duration) * 100)}%`
                                }
                            }
                            audioRefA.current.removeEventListener('loadedmetadata', onLoaded)
                        }

                        audioRefA.current.addEventListener('loadedmetadata', onLoaded)
                    }
                }

                setLoading(false)
            } catch (error) {
                console.error("Error initializing player data:", error)
                setLoading(false)
            }
        }

        initData()
    }, [currentUser])

    const contextValue = {
        audioRef: {
            get current() {
                return getActiveAudio()
            },
            set current(_) {
                // Safe no-op
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