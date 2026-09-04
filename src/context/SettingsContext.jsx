import React, { createContext, useContext, useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { auth, db, messagingPromise } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { onMessage } from 'firebase/messaging'

export const DEFAULT_SETTINGS = {
  streamingQuality: 'high',
  crossfade: 0,
  autoplay: true,
  normalizeVolume: false,
  pushNotifications: true,
  emailDigest: false
}

const SettingsContext = createContext()

export const useSettings = () => useContext(SettingsContext)

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loadingSettings, setLoadingSettings] = useState(true)

  // 1. Firestore Real-time Sync & Auth Observer
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        const local = localStorage.getItem('v1_guest_settings')
        setSettings(local ? JSON.parse(local) : DEFAULT_SETTINGS)
        setLoadingSettings(false)
        return
      }

      const docRef = doc(db, 'users', user.uid, 'settings', 'preferences')
      
      const unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data())
        } else {
          setDoc(docRef, DEFAULT_SETTINGS)
          setSettings(DEFAULT_SETTINGS)
        }
        setLoadingSettings(false)
      })

      return () => unsubscribeSnapshot()
    })

    return () => unsubscribeAuth()
  }, [])

  // 2. Foreground Push Notifications Listener (Inside the component)
  useEffect(() => {
    let unsubscribe = () => {}

    if (settings?.pushNotifications && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      messagingPromise.then((messaging) => {
        if (!messaging) return

        unsubscribe = onMessage(messaging, (payload) => {
          console.log('Foreground message received:', payload)

          const title = payload.notification?.title || 'Valley One Music'
          const options = {
            body: payload.notification?.body,
            icon: '/favicon.ico',
          }

          new Notification(title, options)
        })
      })
    }

    return () => {
      unsubscribe()
    }
  }, [settings?.pushNotifications])

  const updateSetting = async (key, value) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)

    const user = auth.currentUser
    if (user) {
      const docRef = doc(db, 'users', user.uid, 'settings', 'preferences')
      await setDoc(docRef, { [key]: value }, { merge: true })
    } else {
      localStorage.setItem('v1_guest_settings', JSON.stringify(updated))
    }
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, loadingSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}