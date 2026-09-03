import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../../firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true) // <-- 1. Define loading state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)

      timer = setTimeout(() => {
        setLoading(false)
      }, 1000)// <-- 2. Turn off loading once Firebase responds
    })

    return () => unsubscribe()
  }, [])

  const logout = () => signOut(auth)

  return (
    // 3. Ensure 'loading' is passed in the value object here:
    <AuthContext.Provider value={{ currentUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)