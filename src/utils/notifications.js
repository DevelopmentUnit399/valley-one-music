import { getToken, deleteToken } from 'firebase/messaging'
import { doc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db, auth, messagingPromise } from '../firebase'

const VAPID_KEY = 'BMgPIT_5Mm8mCf1jtXKa9DjTjPkGJSbdoQSxIiupnMn_7-MaNV9eCp2VGlRXDJmkaug0dEaVb29PDYMDXzcrdRo'

export const enablePushNotifications = async (userId) => {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support desktop notifications.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied.')
  }

  const messaging = await messagingPromise
  if (!messaging) {
    throw new Error('Firebase Messaging is not supported on this browser.')
  }

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  
  const currentToken = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration
  })

  // Fallback directly to the active Firebase user if userId was undefined
  const activeUid = userId || auth.currentUser?.uid

  console.log('Generated FCM Token:', currentToken)
  console.log('Target User ID:', activeUid)

  if (currentToken && activeUid) {
    const prefRef = doc(db, 'users', activeUid, 'settings', 'preferences')
    await setDoc(prefRef, {
      fcmTokens: arrayUnion(currentToken)
    }, { merge: true })

    console.log('Successfully saved to Firestore!')
    return currentToken
  } else {
    console.warn('Could not save token: User is not authenticated.')
  }

  return null
}

export const disablePushNotifications = async (userId) => {
  try {
    const messaging = await messagingPromise
    if (messaging) {
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY }).catch(() => null)
      const activeUid = userId || auth.currentUser?.uid

      if (currentToken) {
        if (activeUid) {
          const prefRef = doc(db, 'users', activeUid, 'settings', 'preferences')
          await setDoc(prefRef, {
            fcmTokens: arrayRemove(currentToken)
          }, { merge: true }).catch(() => {})
        }
        await deleteToken(messaging).catch(() => {})
      }
    }
  } catch (err) {
    console.error('Error disabling push notifications:', err)
  }
}