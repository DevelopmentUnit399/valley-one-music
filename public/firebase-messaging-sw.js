importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

const firebaseConfig = {
    apiKey: "AIzaSyBkxb-RiIgfR7vwr2iOTkZh3y9Z1wqLgqM",
    authDomain: "valley-one-music.firebaseapp.com",
    projectId: "valley-one-music",
    storageBucket: "valley-one-music.firebasestorage.app",
    messagingSenderId: "1003536130379",
    appId: "1:1003536130379:web:1068f56a95b1b26c80c8ce"
}

firebase.initializeApp(firebaseConfig)

const messaging = firebase.messaging()

// Display incoming push notifications while tab/app is unfocused or closed
messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || 'Valley One Music'
    const notificationOptions = {
        body: payload.notification?.body || 'New releases are now streaming!',
        icon: '/valley-one.ico',
        data: {
            url: payload.data?.url || '/'
        }
    }

    self.registration.showNotification(notificationTitle, notificationOptions)
})

// Focus or open the app when the notification is clicked
self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const targetUrl = event.notification.data?.url || '/'

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus()
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl)
            }
        })
    )
})