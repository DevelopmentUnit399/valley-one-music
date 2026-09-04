import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Save playback state
export const savePlaybackState = async (setUserId, songId, currentTime) => {
    if (!userId || !songId) return
    try {
        const playbackRef = doc(db, 'users', userId, 'playback', 'current')
        await setDoc(playbackRef, {
            songId,
            currentTime: Math.floor(currentTime || 0),
            updatedAt: newDate().toISOString()
        }, { merge: true })
    } catch (error) {
        console.error("Error saving playback state to Firestore:", error)
    }
}

// Fetch saved playback state
export const loadPlaybackState = async (userId) => {
    if (!userId) return null
    try {
        const playbackRef = doc(db, 'users', userId, 'playback', 'current')
        const snap = await getDoc(playbackRef)
        if (snap.exists()) {
            return snap.data()
        }
    } catch (error) {
        console.error("Error loading playback state from Firestore:", error)
    }
    return null
}