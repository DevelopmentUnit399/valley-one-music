import React, { useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import { useAuth } from '../context/AuthContext'
import { enablePushNotifications, disablePushNotifications } from '../utils/notifications'
import Navbar from './Navbar'

const Settings = () => {
  const { settings, updateSetting, loadingSettings } = useSettings()
  const [savedBadge, setSavedBadge] = useState(false)
  const { user } = useAuth()

  const handleUpdate = async (key, value) => {
    await updateSetting(key, value)
    setSavedBadge(true)
    setTimeout(() => setSavedBadge(false), 1800)
  }

  const handleNotificationToggle = async () => {
    const nextState = !settings.pushNotifications

    if (nextState) {
      try {
        await enablePushNotifications(user?.uid)
        await handleUpdate('pushNotifications', true)
      } catch (error) {
        alert(error.message || 'Failed to enable notifications.')
        await handleUpdate('pushNotifications', false)
      }
    } else {
      await disablePushNotifications(user?.uid)
      await handleUpdate('pushNotifications', false)
    }
  }

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto pb-16">
      <Navbar />

      <div className="max-w-3xl w-full mx-auto px-6 py-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Configure playback options, audio fidelity, and notifications.
            </p>
          </div>
          {savedBadge && (
            <span className="text-xs font-semibold bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 px-3 py-1.5 rounded-full transition-opacity">
              Cloud Synced
            </span>
          )}
        </div>

        {loadingSettings ? (
          <div className="space-y-6">
            <div className="w-full h-36 bg-[#181818] border border-[#282828] rounded-xl animate-pulse" />
            <div className="w-full h-36 bg-[#181818] border border-[#282828] rounded-xl animate-pulse" />
            <div className="w-full h-36 bg-[#181818] border border-[#282828] rounded-xl animate-pulse" />
          </div>
        ) : (
          <>
            {/* Audio Quality */}
            <section className="bg-[#181818] border border-[#282828] rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Audio Quality</h2>

              <div className="flex items-center justify-between py-2 border-b border-[#282828]">
                <div>
                  <p className="text-sm font-semibold text-white">Streaming Quality</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Higher bitrates consume more bandwidth.</p>
                </div>
                <select
                  value={settings.streamingQuality}
                  onChange={(e) => handleUpdate('streamingQuality', e.target.value)}
                  className="bg-[#242424] border border-[#3e3e3e] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-white transition-colors cursor-pointer"
                >
                  <option value="low">Automatic (Economy)</option>
                  <option value="normal">Normal (128 kbps)</option>
                  <option value="high">High (256 kbps)</option>
                  <option value="very_high">Very High (320 kbps FLAC/Lossless)</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-white">Normalize Volume</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Set the same loudness level for all tracks.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdate('normalizeVolume', !settings.normalizeVolume)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    settings.normalizeVolume ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.normalizeVolume ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </section>

            {/* Playback Controls */}
            <section className="bg-[#181818] border border-[#282828] rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Playback</h2>

              <div className="flex items-center justify-between py-2 border-b border-[#282828]">
                <div>
                  <p className="text-sm font-semibold text-white">Autoplay</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Keep listening to similar songs when your queue finishes.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdate('autoplay', !settings.autoplay)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    settings.autoplay ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.autoplay ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="py-2">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-white">Crossfade</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Smoothly transition between consecutive tracks.</p>
                  </div>
                  <span className="text-xs font-mono text-zinc-300 bg-[#242424] px-2 py-1 rounded border border-[#333]">
                    {settings.crossfade === 0 ? 'Off' : `${settings.crossfade}s`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="1"
                  value={settings.crossfade}
                  onChange={(e) => handleUpdate('crossfade', Number(e.target.value))}
                  className="w-full accent-white h-1.5 bg-zinc-700 rounded-lg cursor-pointer"
                />
              </div>
            </section>

            {/* Notifications */}
            <section className="bg-[#181818] border border-[#282828] rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Notifications</h2>

              <div className="flex items-center justify-between py-2 border-b border-[#282828]">
                <div>
                  <p className="text-sm font-semibold text-white">New Music & Album Alerts</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Receive updates when new tracks get released!</p>
                </div>
                <button
                  type="button"
                  onClick={handleNotificationToggle}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    settings.pushNotifications ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.pushNotifications ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-white">Weekly Digest</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Email summary of weekly trending hits and playlist updates.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdate('emailDigest', !settings.emailDigest)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    settings.emailDigest ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.emailDigest ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default Settings