import { useEffect, useMemo, useState } from 'react'

const ROUND_RULES = [
  {
    title: 'Round 1: Taboo Style',
    rule: 'Use any words and sounds, but no gestures and no saying parts of the answer.',
  },
  {
    title: 'Round 2: One Word',
    rule: 'Give exactly one word clue for each card. No gestures.',
  },
  {
    title: 'Round 3: Charades',
    rule: 'No words or sounds. Gesture only.',
  },
] as const

const CARDS_FILE_PATH = '/cards.txt'
const GAME_STORAGE_KEY = 'monkeyeers_game_state'
const PLAYER_ROSTER_STORAGE_KEY = 'monkeyeers_player_roster'

type Phase =
  | 'player-setup'
  | 'word-entry'
  | 'team-assign'
  | 'team-randomize'
  | 'turn-intro'
  | 'turn-live'
  | 'confirm-last-card'
  | 'time-up-check'
  | 'round-over'
  | 'game-over'

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = arr[i]
    arr[i] = arr[j]
    arr[j] = temp
  }
  return arr
}

function normalizeCardWord(word: string): string {
  return word.replace(/\s+/g, ' ').trim().toLowerCase()
}

function App() {
  const [phase, setPhase] = useState<Phase>('player-setup')
  const [players, setPlayers] = useState<string[]>([])
  const [newPlayerName, setNewPlayerName] = useState('')

  const [wordEntryIndex, setWordEntryIndex] = useState(0)
  const [wordDraft, setWordDraft] = useState<string[]>(['', '', ''])
  const [playerWords, setPlayerWords] = useState<string[][]>([])

  const [teamNames, setTeamNames] = useState(['Team 1', 'Team 2'])
  const [teamAssignments, setTeamAssignments] = useState<number[]>([])
  const [assignIndex, setAssignIndex] = useState(0)
  const [randomTeamCount, setRandomTeamCount] = useState(2)
  const [randomMembersPerTeam, setRandomMembersPerTeam] = useState(2)
  const [setupError, setSetupError] = useState('')

  const [teams, setTeams] = useState(['Team 1', 'Team 2'])
  const [teamScores, setTeamScores] = useState([0, 0])
  const [roundScores, setRoundScores] = useState<number[][]>([
    [0, 0],
    [0, 0],
    [0, 0],
  ])

  const [allCards, setAllCards] = useState<string[]>([])
  const [deck, setDeck] = useState<string[]>([])
  const [currentCard, setCurrentCard] = useState('')

  const [roundIndex, setRoundIndex] = useState(0)
  const [activeTeamIndex, setActiveTeamIndex] = useState(0)
  const [turnSeconds, setTurnSeconds] = useState(60)
  const [secondsLeft, setSecondsLeft] = useState(60)
  const [passLimit, setPassLimit] = useState(1)
  const [passesUsed, setPassesUsed] = useState(0)
  const [turnPoints, setTurnPoints] = useState(0)
  const [libraryCards, setLibraryCards] = useState<string[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [libraryError, setLibraryError] = useState('')
  const [hasHydratedFromStorage, setHasHydratedFromStorage] = useState(false)

  const cardsPerRound = allCards.length
  const passesRemaining = passLimit < 0 ? Number.POSITIVE_INFINITY : passLimit - passesUsed

  // Load game state from localStorage on mount
  useEffect(() => {
    let loadedFromGameState = false

    try {
      const savedGameState = localStorage.getItem(GAME_STORAGE_KEY)
      if (savedGameState) {
        loadedFromGameState = true
        const state = JSON.parse(savedGameState) as Partial<{
          phase: Phase
          players: string[]
          newPlayerName: string
          wordEntryIndex: number
          wordDraft: string[]
          playerWords: string[][]
          teamNames: string[]
          teamAssignments: number[]
          assignIndex: number
          randomTeamCount: number
          randomMembersPerTeam: number
          setupError: string
          teams: string[]
          teamScores: number[]
          roundScores: number[][]
          allCards: string[]
          deck: string[]
          currentCard: string
          roundIndex: number
          activeTeamIndex: number
          turnSeconds: number
          secondsLeft: number
          passLimit: number
          passesUsed: number
          turnPoints: number
        }>

        if (state.phase) setPhase(state.phase)
        if (state.players) setPlayers(state.players)
        if (typeof state.newPlayerName === 'string') setNewPlayerName(state.newPlayerName)
        if (typeof state.wordEntryIndex === 'number') setWordEntryIndex(state.wordEntryIndex)
        if (state.wordDraft) setWordDraft(state.wordDraft)
        if (state.playerWords) setPlayerWords(state.playerWords)
        if (state.teamNames) setTeamNames(state.teamNames)
        if (state.teamAssignments) setTeamAssignments(state.teamAssignments)
        if (typeof state.assignIndex === 'number') setAssignIndex(state.assignIndex)
        if (typeof state.randomTeamCount === 'number') setRandomTeamCount(state.randomTeamCount)
        if (typeof state.randomMembersPerTeam === 'number') setRandomMembersPerTeam(state.randomMembersPerTeam)
        if (typeof state.setupError === 'string') setSetupError(state.setupError)
        if (state.teams) setTeams(state.teams)
        if (state.teamScores) setTeamScores(state.teamScores)
        if (state.roundScores) setRoundScores(state.roundScores)
        if (state.allCards) setAllCards(state.allCards)
        if (state.deck) setDeck(state.deck)
        if (typeof state.currentCard === 'string') setCurrentCard(state.currentCard)
        if (typeof state.roundIndex === 'number') setRoundIndex(state.roundIndex)
        if (typeof state.activeTeamIndex === 'number') setActiveTeamIndex(state.activeTeamIndex)
        if (typeof state.turnSeconds === 'number') setTurnSeconds(state.turnSeconds)
        if (typeof state.secondsLeft === 'number') setSecondsLeft(state.secondsLeft)
        if (typeof state.passLimit === 'number') setPassLimit(state.passLimit)
        if (typeof state.passesUsed === 'number') setPassesUsed(state.passesUsed)
        if (typeof state.turnPoints === 'number') setTurnPoints(state.turnPoints)
      }

      if (!loadedFromGameState) {
        const savedRoster = localStorage.getItem(PLAYER_ROSTER_STORAGE_KEY)
        if (savedRoster) {
          const roster = JSON.parse(savedRoster) as unknown
          if (Array.isArray(roster)) {
            const cleanRoster = roster
              .filter((name): name is string => typeof name === 'string')
              .map((name) => name.trim())
              .filter(Boolean)
            setPlayers(cleanRoster)
          }
        }
      }
    } catch {
      // If loading fails, continue with default state.
    } finally {
      setHasHydratedFromStorage(true)
    }
  }, [])

  // Save just the player roster so names persist between games.
  useEffect(() => {
    if (!hasHydratedFromStorage) {
      return
    }

    localStorage.setItem(PLAYER_ROSTER_STORAGE_KEY, JSON.stringify(players))
  }, [hasHydratedFromStorage, players])

  // Save game state to localStorage whenever critical state changes
  useEffect(() => {
    if (!hasHydratedFromStorage) {
      return
    }

    const gameState = {
      phase,
      players,
      newPlayerName,
      wordEntryIndex,
      wordDraft,
      playerWords,
      teamNames,
      teamAssignments,
      assignIndex,
      randomTeamCount,
      randomMembersPerTeam,
      setupError,
      teams,
      teamScores,
      roundScores,
      allCards,
      deck,
      currentCard,
      roundIndex,
      activeTeamIndex,
      turnSeconds,
      secondsLeft,
      passLimit,
      passesUsed,
      turnPoints,
    }
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(gameState))
  }, [
    hasHydratedFromStorage,
    phase,
    players,
    newPlayerName,
    wordEntryIndex,
    wordDraft,
    playerWords,
    teamNames,
    teamAssignments,
    assignIndex,
    randomTeamCount,
    randomMembersPerTeam,
    setupError,
    teams,
    teamScores,
    roundScores,
    allCards,
    deck,
    currentCard,
    roundIndex,
    activeTeamIndex,
    turnSeconds,
    secondsLeft,
    passLimit,
    passesUsed,
    turnPoints,
  ])

  // Helper function to clear saved game
  const clearSavedGame = () => {
    localStorage.removeItem(GAME_STORAGE_KEY)
  }

  const clearSavedPlayers = () => {
    localStorage.removeItem(PLAYER_ROSTER_STORAGE_KEY)
    setPlayers([])
    setNewPlayerName('')
    setSetupError('')
  }

  useEffect(() => {
    if (phase !== 'word-entry' || libraryCards.length > 0 || libraryLoading) {
      return
    }

    const loadCardLibrary = async () => {
      setLibraryLoading(true)
      setLibraryError('')

      try {
        const response = await fetch(CARDS_FILE_PATH)
        if (!response.ok) {
          throw new Error('Failed to fetch card data')
        }

        const text = await response.text()
        const cards = text
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)

        setLibraryCards(cards)
      } catch {
        setLibraryError('Could not load card library. Make sure you have a cards.txt file in the public folder.')
      } finally {
        setLibraryLoading(false)
      }
    }

    void loadCardLibrary()
  }, [phase, libraryCards.length, libraryLoading])

  useEffect(() => {
    if (phase !== 'turn-live') {
      return
    }

    if (secondsLeft <= 0) {
      playTimerUpSound()
      setPhase('time-up-check')
      return
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => prev - 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [phase, secondsLeft])

  const playTimerUpSound = () => {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) {
      return
    }

    const context = new AudioContextCtor()
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(880, context.currentTime)
    oscillator.frequency.setValueAtTime(660, context.currentTime + 0.12)
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.3)

    window.setTimeout(() => {
      context.close().catch(() => undefined)
    }, 400)
  }

  const standings = useMemo(
    () =>
      teams
        .map((name, idx) => ({ name, score: teamScores[idx] ?? 0 }))
        .sort((a, b) => b.score - a.score),
    [teams, teamScores],
  )

  const availableLibraryCards = useMemo(() => {
    const selectedSet = new Set(
      playerWords
        .flat()
        .map((word) => word.trim())
        .filter(Boolean)
        .map(normalizeCardWord),
    )

    wordDraft
      .map((word) => word.trim())
      .filter(Boolean)
      .forEach((word) => selectedSet.add(normalizeCardWord(word)))

    return libraryCards.filter((word) => !selectedSet.has(normalizeCardWord(word)))
  }, [libraryCards, playerWords, wordDraft])

  const addPlayer = () => {
    const trimmed = newPlayerName.trim()
    if (!trimmed || players.includes(trimmed) || players.length >= 20) {
      return
    }
    setPlayers((prev) => [...prev, trimmed])
    setNewPlayerName('')
  }

  const removePlayer = (index: number) => {
    setPlayers((prev) => prev.filter((_, idx) => idx !== index))
  }

  const startWordEntry = () => {
    if (players.length < 4) {
      setSetupError('You need at least 4 players before starting word entry.')
      return
    }

    setSetupError('')

    setPlayerWords(Array.from({ length: players.length }, () => ['', '', '']))
    setWordDraft(['', '', ''])
    setWordEntryIndex(0)
    setPhase('word-entry')
  }

  const saveWordsAndContinue = () => {
    const cleanWords = wordDraft.map((word) => word.trim())
    if (cleanWords.some((word) => !word)) {
      setSetupError('Please enter all 3 words before continuing.')
      return
    }

    const normalizedDraft = cleanWords.map(normalizeCardWord)
    const uniqueDraftCount = new Set(normalizedDraft).size
    if (uniqueDraftCount !== normalizedDraft.length) {
      setSetupError('Duplicate cards are not allowed. Please use 3 unique words.')
      return
    }

    const existingWords = playerWords
      .flat()
      .map((word) => word.trim())
      .filter(Boolean)
      .map(normalizeCardWord)

    const existingSet = new Set(existingWords)
    const duplicateAgainstExisting = cleanWords.find((word) => existingSet.has(normalizeCardWord(word)))
    if (duplicateAgainstExisting) {
      setSetupError(`"${duplicateAgainstExisting}" was already added. Please choose a different card.`)
      return
    }

    setSetupError('')

    const nextPlayerWords = playerWords.map((entry) => [...entry])
    nextPlayerWords[wordEntryIndex] = cleanWords
    setPlayerWords(nextPlayerWords)

    if (wordEntryIndex < players.length - 1) {
      setWordEntryIndex((prev) => prev + 1)
      setWordDraft(['', '', ''])
      return
    }

    setTeamAssignments(Array.from({ length: players.length }, () => 0))
    setAssignIndex(0)
    setPhase('team-assign')
  }

  const updateWordDraft = (index: number, value: string) => {
    const nextDraft = [...wordDraft]
    nextDraft[index] = value
    setWordDraft(nextDraft)
  }

  const removeWordFromDraft = (index: number) => {
    const nextDraft = [...wordDraft]
    nextDraft[index] = ''
    setWordDraft(nextDraft)
    setSetupError('')
  }

  const addLibraryWordToDraft = (word: string) => {
    const firstEmptyIndex = wordDraft.findIndex((entry) => !entry.trim())
    if (firstEmptyIndex === -1) {
      setSetupError('All 3 slots are already filled. Remove one to add another card.')
      return
    }

    const nextDraft = [...wordDraft]
    nextDraft[firstEmptyIndex] = word
    setWordDraft(nextDraft)
    setSetupError('')
  }

  const setAssignedTeamForCurrentPlayer = (teamIdx: number) => {
    const nextAssignments = [...teamAssignments]
    nextAssignments[assignIndex] = teamIdx
    setTeamAssignments(nextAssignments)
  }

  const updateTeamName = (index: number, value: string) => {
    const nextTeams = [...teamNames]
    nextTeams[index] = value
    setTeamNames(nextTeams)
  }

  const addTeam = () => {
    if (teamNames.length >= 6) {
      return
    }
    setTeamNames((prev) => [...prev, `Team ${prev.length + 1}`])
  }

  const removeTeam = (removeIndex: number) => {
    if (teamNames.length <= 2) {
      return
    }

    setTeamNames((prev) => prev.filter((_, idx) => idx !== removeIndex))
    setTeamAssignments((prev) =>
      prev.map((assigned) => {
        if (assigned === removeIndex) {
          return 0
        }
        if (assigned > removeIndex) {
          return assigned - 1
        }
        return assigned
      }),
    )
  }

  const beginGame = () => {
    const cards = Array.from(new Set(playerWords.flat().map((word) => word.trim()).filter(Boolean)))
    const cleanTeamNames = teamNames.map((team, idx) => team.trim() || `Team ${idx + 1}`)
    const usedTeamIndexes = Array.from(new Set(teamAssignments))
    const teamPlayerCounts = usedTeamIndexes.map(
      (teamIdx) => teamAssignments.filter((assigned) => assigned === teamIdx).length,
    )

    if (players.length < 4) {
      setSetupError('You need at least 4 players to start the game.')
      return
    }

    if (usedTeamIndexes.length < 2) {
      setSetupError('You must assign players to at least 2 teams.')
      return
    }

    if (teamPlayerCounts.some((count) => count < 2)) {
      setSetupError('Each team must have at least 2 players.')
      return
    }

    if (cards.length < 6) {
      setSetupError('Not enough valid cards to start. Each player must enter 3 words.')
      return
    }

    setSetupError('')

    const indexMap = new Map<number, number>()
    usedTeamIndexes.forEach((oldIndex, newIndex) => {
      indexMap.set(oldIndex, newIndex)
    })

    const compactTeams = usedTeamIndexes.map((idx) => cleanTeamNames[idx])
    const initialDeck = shuffle(cards)
    const resetRoundScores = Array.from({ length: 3 }, () =>
      Array.from({ length: compactTeams.length }, () => 0),
    )

    setTeams(compactTeams)
    setTeamScores(Array.from({ length: compactTeams.length }, () => 0))
    setRoundScores(resetRoundScores)
    setAllCards(cards)
    setDeck(initialDeck)
    setCurrentCard(initialDeck[0] ?? '')
    setRoundIndex(0)
    setActiveTeamIndex(0)
    setTurnPoints(0)
    setPassesUsed(0)
    setSecondsLeft(turnSeconds)
    setTeamAssignments((prev) => prev.map((oldIndex) => indexMap.get(oldIndex) ?? 0))
    setPhase('turn-intro')
  }

  const openRandomizeTeams = () => {
    setSetupError('')
    setRandomTeamCount(Math.max(2, Math.min(6, teamNames.length)))
    setRandomMembersPerTeam(2)
    setPhase('team-randomize')
  }

  const applyRandomizedTeams = () => {
    const teamCount = Number(randomTeamCount)
    const membersPerTeam = Number(randomMembersPerTeam)

    if (!Number.isInteger(teamCount) || teamCount < 2 || teamCount > 6) {
      setSetupError('Choose a team count between 2 and 6.')
      return
    }

    if (!Number.isInteger(membersPerTeam) || membersPerTeam < 2) {
      setSetupError('Each team must have at least 2 members.')
      return
    }

    if (teamCount * membersPerTeam !== players.length) {
      setSetupError(
        `Team count x members per team must equal ${players.length} players exactly.`,
      )
      return
    }

    const nextTeamNames = Array.from({ length: teamCount }, (_, idx) => {
      const existing = teamNames[idx]?.trim()
      return existing || `Team ${idx + 1}`
    })

    const shuffledPlayerIndexes = shuffle(players.map((_, idx) => idx))
    const nextAssignments = Array.from({ length: players.length }, () => 0)

    let cursor = 0
    for (let teamIdx = 0; teamIdx < teamCount; teamIdx += 1) {
      for (let memberIdx = 0; memberIdx < membersPerTeam; memberIdx += 1) {
        const playerIdx = shuffledPlayerIndexes[cursor]
        nextAssignments[playerIdx] = teamIdx
        cursor += 1
      }
    }

    setTeamNames(nextTeamNames)
    setTeamAssignments(nextAssignments)
    setAssignIndex(0)
    setSetupError('')
    setPhase('team-assign')
  }

  const startTurn = () => {
    if (deck.length === 0) {
      return
    }
    setSecondsLeft(turnSeconds)
    setPassesUsed(0)
    setTurnPoints(0)
    setCurrentCard(deck[0])
    setPhase('turn-live')
  }

  const finalizeTurn = (bonusPoint = 0, consumeCurrentCard = false) => {
    if (phase !== 'turn-live' && phase !== 'time-up-check' && phase !== 'confirm-last-card') {
      return
    }

    const earnedPoints = turnPoints + bonusPoint
    const nextTeamScores = [...teamScores]
    nextTeamScores[activeTeamIndex] += earnedPoints
    setTeamScores(nextTeamScores)

    const nextRoundScores = roundScores.map((scores) => [...scores])
    nextRoundScores[roundIndex][activeTeamIndex] += earnedPoints
    setRoundScores(nextRoundScores)

    const nextDeck = consumeCurrentCard ? deck.slice(1) : [...deck]
    setDeck(nextDeck)
    setCurrentCard(nextDeck[0] ?? '')

    if (nextDeck.length === 0) {
      setPhase('round-over')
      return
    }

    setActiveTeamIndex((prev) => (prev + 1) % teams.length)
    setPhase('turn-intro')
  }

  const advanceToNextCard = (nextDeck: string[]) => {
    setDeck(nextDeck)
    setCurrentCard(nextDeck[0] ?? '')
    if (nextDeck.length === 0) {
      setPhase('round-over')
    }
  }

  const scoreCard = () => {
    if (!currentCard || deck.length === 0) {
      return
    }

    // If this is the final card in the round, commit points immediately
    // before transitioning to round-over.
    if (deck.length === 1) {
      const earnedPoints = turnPoints + 1

      const nextTeamScores = [...teamScores]
      nextTeamScores[activeTeamIndex] += earnedPoints
      setTeamScores(nextTeamScores)

      const nextRoundScores = roundScores.map((scores) => [...scores])
      nextRoundScores[roundIndex][activeTeamIndex] += earnedPoints
      setRoundScores(nextRoundScores)

      setTurnPoints(earnedPoints)
      setDeck([])
      setCurrentCard('')
      setPhase('round-over')
      return
    }

    setTurnPoints((prev) => prev + 1)
    advanceToNextCard(deck.slice(1))
  }

  const passCard = () => {
    if (!currentCard || deck.length <= 1) {
      return
    }

    if (passLimit >= 0 && passesUsed >= passLimit) {
      return
    }

    setPassesUsed((prev) => prev + 1)
    const [, ...rest] = deck
    advanceToNextCard([...rest, currentCard])
  }

  const endTurn = () => {
    setPhase('confirm-last-card')
  }

  const finalizeTurnWithoutLastCard = () => {
    finalizeTurn(0, false)
  }

  const finalizeTurnWithLastCard = () => {
    finalizeTurn(1, true)
  }

  const nextRound = () => {
    if (roundIndex >= ROUND_RULES.length - 1) {
      setPhase('game-over')
      return
    }

    const nextRoundIndex = roundIndex + 1
    const nextDeck = shuffle(allCards)

    setRoundIndex(nextRoundIndex)
    setDeck(nextDeck)
    setCurrentCard(nextDeck[0] ?? '')
    setPassesUsed(0)
    setTurnPoints(0)
    setActiveTeamIndex(0)
    setSecondsLeft(turnSeconds)
    setPhase('turn-intro')
  }

  const resetToSetup = () => {
    clearSavedGame()
    setPhase('player-setup')
    setNewPlayerName('')
    setPlayerWords([])
    setTeamNames(['Team 1', 'Team 2'])
    setTeamAssignments([])
    setTeams(['Team 1', 'Team 2'])
    setTeamScores([0, 0])
    setRoundScores([
      [0, 0],
      [0, 0],
      [0, 0],
    ])
    setAllCards([])
    setDeck([])
    setCurrentCard('')
    setRoundIndex(0)
    setActiveTeamIndex(0)
    setPassesUsed(0)
    setTurnPoints(0)
  }

  return (
    <main className="app-shell">
      <div className="grain" aria-hidden="true" />
      <header className="hero">
        <p className="eyebrow">Party Game</p>
        <h1>Monkeyeers Match Host</h1>
        <p className="subtitle">Three rounds. Same cards. Faster clues every time.</p>
      </header>

      {phase === 'player-setup' && (
        <section className="panel setup-grid">
          <div className="card-block">
            <h2>Add Players</h2>
            <p className="muted">Add everyone by name before entering words.</p>
            <div className="team-row">
              <input
                value={newPlayerName}
                onChange={(event) => setNewPlayerName(event.target.value)}
                aria-label="New player name"
                placeholder="Enter player name"
              />
              <button type="button" className="ghost" onClick={addPlayer}>
                Add
              </button>
            </div>
            <ul className="round-list">
              {players.map((player, idx) => (
                <li key={`player-${player}-${idx}`}>
                  <span>{player}</span>
                  <button type="button" className="ghost" onClick={() => removePlayer(idx)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="button-row" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="primary" onClick={startWordEntry} disabled={players.length < 4}>
                Continue To Words
              </button>
              <button
                type="button"
                className="ghost"
                onClick={clearSavedPlayers}
                disabled={players.length === 0}
              >
                Clear Saved Players
              </button>
            </div>
            <p className="muted small">Need at least 4 players.</p>
            {setupError && <p className="error-note">{setupError}</p>}
          </div>

          <div className="card-block">
            <h2>Game Options</h2>
            <p className="muted">These settings apply to all rounds.</p>
            <div className="setup-options">
              <label>
                Seconds per turn
                <input
                  type="number"
                  min={30}
                  max={120}
                  value={turnSeconds === 0 ? '' : turnSeconds}
                  onChange={(event) => {
                    const value = event.target.value
                    if (value === '') {
                      setTurnSeconds(0)
                    } else {
                      const num = parseInt(value, 10)
                      if (!isNaN(num)) {
                        setTurnSeconds(num)
                      }
                    }
                  }}
                  onBlur={() => {
                    let value = turnSeconds
                    if (value === 0 || value < 30) value = 30
                    if (value > 120) value = 120
                    setTurnSeconds(value)
                  }}
                />
              </label>
              <label>
                Passes per turn (-1 unlimited)
                <input
                  type="number"
                  min={-1}
                  max={10}
                  value={passLimit}
                  onChange={(event) => {
                    const value = parseInt(event.target.value, 10)
                    if (value === -1 || value >= 0) {
                      setPassLimit(value)
                    }
                  }}
                />
              </label>
            </div>
            <p className="muted small">Next: each player enters 3 words.</p>
          </div>
        </section>
      )}

      {phase === 'word-entry' && (
        <section className="panel setup-grid">
          <div className="card-block">
            <h2>Word Entry</h2>
            <p className="muted">
              {players[wordEntryIndex]}: enter 3 words ({wordEntryIndex + 1} / {players.length})
            </p>
            <div className="team-list">
              {[0, 1, 2].map((idx) => (
                <div className="team-row" key={`word-${idx}`}>
                  <input
                    value={wordDraft[idx]}
                    onChange={(event) => updateWordDraft(idx, event.target.value)}
                    placeholder={`Word ${idx + 1}`}
                  />
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => removeWordFromDraft(idx)}
                    disabled={!wordDraft[idx].trim()}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="primary" onClick={saveWordsAndContinue}>
              {wordEntryIndex < players.length - 1 ? 'Save And Next Player' : 'Continue To Team Assignment'}
            </button>
            {setupError && <p className="error-note">{setupError}</p>}
          </div>

          <div className="card-block">
            <h2>Card Library</h2>
            <p className="muted">Pick from suggested words or enter your own.</p>
            {libraryLoading && <p className="muted small">Loading card library...</p>}
            {libraryError && <p className="error-note">{libraryError}</p>}
            {!libraryLoading && !libraryError && (
              <div className="library-list" aria-label="Suggested card words">
                {availableLibraryCards.map((card) => (
                  <button
                    type="button"
                    className="library-chip"
                    key={`library-${card}`}
                    onClick={() => addLibraryWordToDraft(card)}
                  >
                    {card}
                  </button>
                ))}
                {availableLibraryCards.length === 0 && (
                  <p className="muted small">No available library cards left for this turn.</p>
                )}
              </div>
            )}

            <h3>Players In Game</h3>
            <ul className="round-list">
              {players.map((player, idx) => (
                <li key={`word-player-${player}-${idx}`}>
                  <span>{player}</span>
                  <strong>{idx < wordEntryIndex ? 'Done' : idx === wordEntryIndex ? 'Current' : 'Waiting'}</strong>
                </li>
              ))}
            </ul>
            <button type="button" className="ghost" onClick={() => setPhase('player-setup')}>
              Back To Players
            </button>
          </div>
        </section>
      )}

      {phase === 'team-assign' && (
        <section className="panel setup-grid">
          <div className="card-block">
            <h2>Assign Teams</h2>
            <p className="muted">
              Assign {players[assignIndex]} ({assignIndex + 1} / {players.length})
            </p>

            <div className="team-list">
              {teamNames.map((team, idx) => (
                <label key={`team-assign-${idx}`} className="assign-row">
                  <input
                    type="radio"
                    checked={teamAssignments[assignIndex] === idx}
                    onChange={() => setAssignedTeamForCurrentPlayer(idx)}
                  />
                  <span>{team}</span>
                </label>
              ))}
            </div>

            <div className="button-row">
              <button
                type="button"
                className="ghost"
                onClick={() => setAssignIndex((prev) => Math.max(0, prev - 1))}
                disabled={assignIndex === 0}
              >
                Previous
              </button>
              {assignIndex < players.length - 1 ? (
                <button
                  type="button"
                  className="primary"
                  onClick={() => setAssignIndex((prev) => Math.min(players.length - 1, prev + 1))}
                >
                  Next Player
                </button>
              ) : (
                <button type="button" className="primary" onClick={beginGame}>
                  Start Game
                </button>
              )}
              <button type="button" className="ghost" onClick={openRandomizeTeams}>
                Randomize Teams
              </button>
            </div>
            <p className="muted small">Rules: minimum 2 teams used, and each team needs at least 2 players.</p>
            {setupError && <p className="error-note">{setupError}</p>}
          </div>

          <div className="card-block">
            <h2>Team Names</h2>
            <p className="muted">Rename teams and add or remove teams (2 to 6 total).</p>
            <div className="team-list">
              {teamNames.map((team, idx) => (
                <div className="team-row" key={`team-name-${idx}`}>
                  <input
                    value={team}
                    onChange={(event) => updateTeamName(idx, event.target.value)}
                    aria-label={`Team ${idx + 1} name`}
                  />
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => removeTeam(idx)}
                    disabled={teamNames.length <= 2}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="ghost" onClick={addTeam} disabled={teamNames.length >= 6}>
              Add Team
            </button>

            <h3>Assignment Summary</h3>
            <ul className="round-list">
              {players.map((player, idx) => (
                <li key={`summary-${player}-${idx}`}>
                  <span>{player}</span>
                  <strong>{teamNames[teamAssignments[idx]]}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {phase === 'team-randomize' && (
        <section className="panel setup-grid">
          <div className="card-block">
            <h2>Randomize Teams</h2>
            <p className="muted">
              Choose the team setup, then auto-assign all players randomly.
            </p>
            <div className="setup-options">
              <label>
                Number of teams
                <input
                  type="number"
                  min={2}
                  max={6}
                  value={randomTeamCount}
                  onChange={(event) => setRandomTeamCount(Number(event.target.value) || 2)}
                />
              </label>
              <label>
                Members per team
                <input
                  type="number"
                  min={2}
                  max={Math.max(2, players.length)}
                  value={randomMembersPerTeam}
                  onChange={(event) => setRandomMembersPerTeam(Number(event.target.value) || 2)}
                />
              </label>
            </div>
            <p className="muted small">
              Players: {players.length}. Required: teams x members must equal players.
            </p>
            <div className="button-row">
              <button type="button" className="ghost" onClick={() => setPhase('team-assign')}>
                Back
              </button>
              <button type="button" className="primary" onClick={applyRandomizedTeams}>
                Apply Random Teams
              </button>
            </div>
            {setupError && <p className="error-note">{setupError}</p>}
          </div>

          <div className="card-block">
            <h2>Current Players</h2>
            <ul className="round-list">
              {players.map((player, idx) => (
                <li key={`random-player-${player}-${idx}`}>
                  <span>{player}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {(phase === 'turn-intro' || phase === 'turn-live' || phase === 'confirm-last-card' || phase === 'time-up-check' || phase === 'round-over' || phase === 'game-over') && (
        <section className="panel game-grid">
          <aside className="scoreboard">
            <h2>Scoreboard</h2>
            <ul>
              {teams.map((team, idx) => (
                <li key={`score-${team}-${idx}`} className={idx === activeTeamIndex ? 'active' : ''}>
                  <span>{team}</span>
                  <strong>{teamScores[idx]}</strong>
                </li>
              ))}
            </ul>
            <div className="round-badge">
              <h3>{ROUND_RULES[roundIndex].title}</h3>
              <p>{ROUND_RULES[roundIndex].rule}</p>
            </div>
          </aside>

          <div className="play-area">
            {phase === 'turn-intro' && (
              <div className="stage">
                <h2>{teams[activeTeamIndex]} is up</h2>
                <p>{ROUND_RULES[roundIndex].rule}</p>
                <p>
                  Deck left: <strong>{deck.length}</strong> / {cardsPerRound}
                </p>
                <button type="button" className="primary" onClick={startTurn}>
                  Start Turn
                </button>
              </div>
            )}

            {phase === 'turn-live' && (
              <div className="stage live">
                <div className="turn-meta">
                  <p>
                    Time: <strong>{secondsLeft}s</strong>
                  </p>
                  <p>
                    Turn points: <strong>{turnPoints}</strong>
                  </p>
                  <p>
                    Passes left:{' '}
                    <strong>{Number.isFinite(passesRemaining) ? passesRemaining : 'Unlimited'}</strong>
                  </p>
                </div>
                <article className="card-face" aria-live="polite">
                  {currentCard || 'No card'}
                </article>
                <div className="button-row">
                  <button type="button" className="ghost" onClick={passCard}>
                    Pass
                  </button>
                  <button type="button" className="primary" onClick={scoreCard}>
                    Correct
                  </button>
                  <button type="button" className="danger" onClick={endTurn}>
                    End Turn
                  </button>
                </div>
              </div>
            )}

            {phase === 'confirm-last-card' && (
              <div className="stage">
                <h2>Did they get the last card?</h2>
                <p>
                  Was {teams[activeTeamIndex]} able to guess this card before ending the turn?
                </p>
                <article className="card-face" aria-live="polite">
                  {currentCard || 'No card'}
                </article>
                <div className="button-row">
                  <button type="button" className="primary" onClick={finalizeTurnWithLastCard}>
                    Yes, Count It (+1)
                  </button>
                  <button type="button" className="ghost" onClick={finalizeTurnWithoutLastCard}>
                    No, Don't Count It
                  </button>
                </div>
              </div>
            )}

            {phase === 'time-up-check' && (
              <div className="stage">
                <h2>Time is up!</h2>
                <p>
                  Did {teams[activeTeamIndex]} get this card right before the buzzer?
                </p>
                <article className="card-face" aria-live="polite">
                  {currentCard || 'No card'}
                </article>
                <div className="button-row">
                  <button type="button" className="primary" onClick={() => finalizeTurn(1, true)}>
                    Yes, Count It (+1)
                  </button>
                  <button type="button" className="ghost" onClick={() => finalizeTurn(0, false)}>
                    No, Keep Card
                  </button>
                </div>
              </div>
            )}

            {phase === 'round-over' && (
              <div className="stage">
                <h2>{ROUND_RULES[roundIndex].title} complete</h2>
                <p>Round scores:</p>
                <ul className="round-list">
                  {teams.map((team, idx) => (
                    <li key={`round-score-${team}-${idx}`}>
                      <span>{team}</span>
                      <strong>{roundScores[roundIndex][idx]}</strong>
                    </li>
                  ))}
                </ul>
                <button type="button" className="primary" onClick={nextRound}>
                  {roundIndex < ROUND_RULES.length - 1 ? 'Start Next Round' : 'Show Final Result'}
                </button>
              </div>
            )}

            {phase === 'game-over' && (
              <div className="stage">
                <h2>Final Standings</h2>
                <ol className="final-list">
                  {standings.map((entry) => (
                    <li key={`standing-${entry.name}`}>
                      <span>{entry.name}</span>
                      <strong>{entry.score}</strong>
                    </li>
                  ))}
                </ol>
                <div className="button-row">
                  <button type="button" className="primary" onClick={resetToSetup}>
                    New Game Setup
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  )
}

export default App
