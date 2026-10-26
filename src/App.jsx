import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { currentUser, logout } from './lib/auth'
import { loadBank } from './lib/bank'
import { getActiveGame, getSettings, saveSettings } from './lib/db'
import { setSoundEnabled } from './lib/sound'
import Login from './screens/Login'
import Home from './screens/Home'
import Game from './screens/Game'
import Stats from './screens/Stats'
import Review from './screens/Review'
import BankBrowser from './screens/BankBrowser'
import Settings from './screens/Settings'
import TopBar from './components/TopBar'
import ResumePrompt from './components/ResumePrompt'

const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

export default function App() {
  const [user, setUser] = useState(currentUser)
  const [screen, setScreen] = useState('home')
  const [bank, setBank] = useState(null)
  const [bankError, setBankError] = useState(null)
  const [settings, setSettingsState] = useState(null)
  const [activeGame, setActiveGame] = useState(null)
  const [resumeAsked, setResumeAsked] = useState(false)
  const [gameRequest, setGameRequest] = useState(null) // {resumeId} | {options}

  useEffect(() => {
    loadBank().then(setBank, (e) => setBankError(e.message))
  }, [])

  useEffect(() => {
    if (!user) return
    getSettings(user.username).then((s) => {
      setSettingsState(s)
      setSoundEnabled(s.sound)
    })
    getActiveGame(user.username).then((g) => {
      setActiveGame(g ?? null)
      setResumeAsked(!g)
    })
  }, [user])

  const updateSettings = useCallback(
    async (patch) => {
      const next = { ...settings, ...patch }
      setSettingsState(next)
      setSoundEnabled(next.sound)
      await saveSettings(user.username, next)
    },
    [settings, user],
  )

  const refreshActive = useCallback(async () => {
    if (!user) return
    setActiveGame((await getActiveGame(user.username)) ?? null)
  }, [user])

  const go = useCallback((s) => {
    setScreen(s)
    window.scrollTo({ top: 0 })
  }, [])

  const startGame = useCallback(
    (req) => {
      setGameRequest({ ...req, key: Date.now() })
      go('game')
    },
    [go],
  )

  const doLogout = () => {
    logout()
    setUser(null)
    setScreen('home')
    setActiveGame(null)
    setResumeAsked(false)
  }

  if (!user) return <Login onLogin={setUser} />

  const ctx = { user, bank, bankError, settings, updateSettings, go, screen, activeGame, refreshActive, startGame }

  return (
    <AppCtx.Provider value={ctx}>
      <div className="min-h-screen flex flex-col">
        {screen !== 'game' && <TopBar onLogout={doLogout} />}
        <main className={`flex-1 ${screen !== 'game' ? 'pb-20 md:pb-0' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={screen === 'game' ? `game-${gameRequest?.key}` : screen}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {screen === 'home' && <Home />}
              {screen === 'game' && settings && bank && <Game request={gameRequest} />}
              {screen === 'stats' && <Stats />}
              {screen === 'review' && <Review />}
              {screen === 'bank' && <BankBrowser />}
              {screen === 'settings' && <Settings />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <AnimatePresence>
        {!resumeAsked && activeGame && bank && (
          <ResumePrompt
            game={activeGame}
            onContinue={() => {
              setResumeAsked(true)
              startGame({ resumeId: activeGame.id })
            }}
            onNew={() => {
              setResumeAsked(true)
              startGame({ options: { rounds: ['J', 'DJ'] } })
            }}
            onLater={() => setResumeAsked(true)}
          />
        )}
      </AnimatePresence>
    </AppCtx.Provider>
  )
}
