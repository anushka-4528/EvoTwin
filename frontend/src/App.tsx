import { useEffect, useState, type FormEvent } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Clock3,
  Download,
  Droplets,
  Dumbbell,
  Gauge,
  HeartPulse,
  LogOut,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import './App.css'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/chat', label: 'Assistant' },
  { to: '/health', label: 'Health Journal' },
  { to: '/insights', label: 'Insights' },
  { to: '/twin', label: 'My profile' },
  { to: '/settings', label: 'Settings' },
]

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8002/api'
const AUTH_TOKEN_KEY = 'vitatwin_access_token'

type ApiErrorBody = { detail?: string | { msg?: string }[] }

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  const body = await response.json().catch(() => null) as ApiErrorBody | null
  if (!response.ok) {
    const detail = body?.detail
    const message = typeof detail === 'string'
      ? detail
      : Array.isArray(detail) ? detail.map((item) => item.msg).filter(Boolean).join(', ') : ''
    throw new Error(message || `Request failed (${response.status})`)
  }
  return body as T
}

type ChatSession = { id: string; title: string; updated_at: string }
type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  evidence?: { title?: string; source?: string; url?: string }[]
  context_used?: { label: string; value: string; source: string }[]
}
type ChatAnswer = {
  message: ChatMessage
  response_text: string
  personalized_observations: string[]
  recommendations: string[]
  rationale: string
  evidence_sources: { title?: string; source?: string; url?: string }[]
  uncertainty: string
  safety_notice: string
  follow_up_question?: string | null
  context_used: { label: string; value: string; source: string }[]
}
type HealthLog = {
  id: string
  date: string
  sleep_hours?: number | null
  steps?: number | null
  hydration_liters?: number | null
  nutrition_score?: number | null
  stress_level?: number | null
  notes?: string | null
  wellness_index?: number | null
  completeness?: number | null
}
type WellnessSummary = {
  average_index: number
  latest_index: number
  completeness: number
  domain_summary: Record<string, number>
}
type ScenarioValues = {
  sleep_hours: number
  steps: number
  hydration_liters: number
  nutrition_score: number
  stress_level: number
}
type PredictionResult = {
  status: 'ok' | 'missing_model'
  baseline_estimate?: number
  scenario_estimate?: number
  message?: string
  limitations?: string
}
type UserProfile = {
  full_name: string
  email: string
  age?: number | null
  gender?: string | null
  occupation?: string | null
  activity_level?: string | null
  goals: string[]
  dietary_preferences: string[]
  activity_preferences: string[]
  exercise_preferences: string[]
  preferred_activities: string[]
  avoided_activities: string[]
  sleep_hours?: number | null
  health_history?: string | null
  lifestyle_summary?: string | null
  onboarding_completed: boolean
}
type ProfileForm = {
  full_name: string
  age: string
  gender: string
  occupation: string
  activity_level: string
  goals: string
  dietary_preferences: string
  activity_preferences: string
  exercise_preferences: string
  preferred_activities: string
  avoided_activities: string
  sleep_hours: string
  health_history: string
  lifestyle_summary: string
}
type TwinMemory = {
  id: string
  category: string
  content: string
  memory_type: string
  created_at: string
}
type DashboardSummary = {
  user: { name: string; email: string }
  goals: string[]
  twin_version: number
  log_count: number
  session_count: number
  latest_log: Pick<HealthLog, 'date' | 'wellness_index' | 'sleep_hours' | 'steps' | 'hydration_liters' | 'stress_level'> | null
  recent_updates: { id: string; summary: string; created_at: string }[]
}
type DigitalTwin = {
  id: string
  user_id: string
  profile: UserProfile
  goals: string[]
  long_term_memories: TwinMemory[]
  session_memories: TwinMemory[]
  onboarding_completed: boolean
  version: number
  updated_at?: string
}
type TwinHistoryEvent = { id: string; event_type: string; summary: string; created_at: string }

function App() {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY))
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(() => Boolean(localStorage.getItem(AUTH_TOKEN_KEY)))

  useEffect(() => {
    if (!accessToken) {
      setCurrentUser(null)
      setIsCheckingSession(false)
      return
    }

    let isMounted = true
    setIsCheckingSession(true)
    apiRequest<UserProfile>('/auth/me').then((user) => {
      if (isMounted) setCurrentUser(user)
    }).catch(() => {
      if (isMounted) {
        localStorage.removeItem(AUTH_TOKEN_KEY)
        setCurrentUser(null)
        setAccessToken(null)
      }
    }).finally(() => {
      if (isMounted) setIsCheckingSession(false)
    })
    return () => { isMounted = false }
  }, [accessToken])

  const handleAuthenticated = (token: string, user: UserProfile) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    setAccessToken(token)
    setCurrentUser(user)
  }

  const handleSignOut = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    setAccessToken(null)
    setCurrentUser(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={accessToken
            ? isCheckingSession ? <SessionLoading />
              : currentUser ? <Navigate to={currentUser.onboarding_completed ? '/dashboard' : '/onboarding'} replace />
                : <AuthPage onAuthenticated={handleAuthenticated} />
            : <AuthPage onAuthenticated={handleAuthenticated} />}
        />
        <Route
          path="/*"
          element={!accessToken ? <Navigate to="/auth" replace />
            : isCheckingSession ? <SessionLoading />
              : currentUser ? <AuthenticatedApp currentUser={currentUser} onUserUpdated={setCurrentUser} onSignOut={handleSignOut} />
                : <Navigate to="/auth" replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}

function SessionLoading() {
  return <main className="session-loading" role="status">Checking your secure session…</main>
}

function AuthenticatedApp({
  currentUser,
  onUserUpdated,
  onSignOut,
}: {
  currentUser: UserProfile
  onUserUpdated: (user: UserProfile) => void
  onSignOut: () => void
}) {
  const location = useLocation()
  if (!currentUser.onboarding_completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  if (currentUser.onboarding_completed && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand-wrap">
            <div className="brand-icon">
              <HeartPulse size={20} />
            </div>
            <div>
              <div className="brand-name">EvoTwin</div>
              <div className="brand-tag">Digital wellness companion</div>
            </div>
          </div>

          {currentUser.onboarding_completed && (
            <nav className="nav-list" aria-label="Main navigation">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'nav-link-active' : ''}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}
          <button type="button" className="sign-out-btn" onClick={onSignOut}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/onboarding" element={<OnboardingPage currentUser={currentUser} onCompleted={onUserUpdated} />} />
          <Route path="/dashboard" element={<DashboardPage currentUser={currentUser} />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/twin" element={<TwinPage />} />
          <Route path="/settings" element={<SettingsPage onSignOut={onSignOut} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function AuthPage({ onAuthenticated }: { onAuthenticated: (token: string, user: UserProfile) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const payload = {
      email: String(formData.get('email')),
      password: String(formData.get('password')),
      ...(mode === 'register' ? { full_name: String(formData.get('full_name')) } : {}),
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json() as { access_token?: string; detail?: string; user?: UserProfile }

      if (!response.ok) {
        throw new Error(result.detail ?? 'Unable to authenticate. Please try again.')
      }
      if (!result.access_token) {
        throw new Error('The server did not return an access token.')
      }
      if (!result.user) {
        throw new Error('The server did not return your profile.')
      }

      onAuthenticated(result.access_token, result.user)
      navigate(mode === 'register' || !result.user.onboarding_completed ? '/onboarding' : '/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError instanceof Error
        ? requestError.message
        : 'Unable to reach the server. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-screen">
      <aside className="auth-story">
        <div className="auth-brand">
          <span className="auth-brand-icon"><HeartPulse size={21} /></span>
          <span>EvoTwin</span>
        </div>
        <div className="auth-story-copy">
          <p className="auth-kicker">Your wellness, in context</p>
          <h1>A healthier rhythm starts with understanding.</h1>
          <p>Sign in to continue to your personal wellness companion.</p>
        </div>
        <div className="auth-story-footer">Private by design <span aria-hidden="true">·</span> Built around you</div>
      </aside>

      <section className="auth-form-wrap" aria-labelledby="auth-heading">
        <div className="auth-form-content">
          <div className="auth-mode-switch" role="tablist" aria-label="Account access">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'auth-mode-active' : ''}
              onClick={() => { setMode('login'); setError('') }}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'auth-mode-active' : ''}
              onClick={() => { setMode('register'); setError('') }}
            >
              Create account
            </button>
          </div>

          <p className="auth-kicker">{mode === 'login' ? 'Welcome back' : 'Get started'}</p>
          <h2 id="auth-heading">
            {mode === 'login' ? 'Sign in to EvoTwin' : 'Create your account'}
          </h2>
          <p className="auth-form-caption">
            {mode === 'login'
              ? 'Your wellness dashboard is ready when you are.'
              : 'Start building a wellness profile that fits your life.'}
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <label>
                Full name
                <input name="full_name" type="text" autoComplete="name" required />
              </label>
            )}
            <label>
              Email address
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={mode === 'register' ? 6 : undefined}
                required
              />
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Please wait...'
                : mode === 'login' ? 'Sign in' : 'Create account'}
              {!isSubmitting && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}

function OnboardingPage({
  currentUser,
  onCompleted,
}: {
  currentUser: UserProfile
  onCompleted: (user: UserProfile) => void
}) {
  const [form, setForm] = useState<ProfileForm>({
    full_name: currentUser.full_name,
    age: currentUser.age == null ? '' : String(currentUser.age),
    gender: currentUser.gender ?? '',
    occupation: currentUser.occupation ?? '',
    activity_level: currentUser.activity_level ?? '',
    goals: currentUser.goals.join(', '),
    dietary_preferences: currentUser.dietary_preferences.join(', '),
    activity_preferences: currentUser.activity_preferences.join(', '),
    exercise_preferences: currentUser.exercise_preferences.join(', '),
    preferred_activities: currentUser.preferred_activities.join(', '),
    avoided_activities: currentUser.avoided_activities.join(', '),
    sleep_hours: currentUser.sleep_hours == null ? '' : String(currentUser.sleep_hours),
    health_history: currentUser.health_history ?? '',
    lifestyle_summary: currentUser.lifestyle_summary ?? '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [otherFood, setOtherFood] = useState('')
  const [otherExercise, setOtherExercise] = useState('')
  const [otherPreferred, setOtherPreferred] = useState('')
  const [otherAvoided, setOtherAvoided] = useState('')
  const navigate = useNavigate()

  const changeField = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const noPreferenceAnswers = new Set(['none', 'n/a', 'not applicable', 'no preference', 'no preferences', 'no restrictions'])
    const toList = (value: string) => value.split(',').map((item) => item.trim()).filter((item) => item && !noPreferenceAnswers.has(item.toLowerCase()))
    const preferenceAnswers = [
      { field: 'dietary_preferences', label: 'Food preferences', other: otherFood },
      { field: 'exercise_preferences', label: 'Exercise preferences', other: otherExercise },
      { field: 'preferred_activities', label: 'Activities you like', other: otherPreferred },
      { field: 'avoided_activities', label: 'Activities you want to avoid', other: otherAvoided },
    ] as const
    for (const preference of preferenceAnswers) {
      const value = form[preference.field]
      if (!value.trim()) {
        setError(`Choose an option for ${preference.label}, or select “None”.`)
        return
      }
      if (value.split(',').some((item) => item.trim().toLowerCase() === 'other') && !preference.other.trim()) {
        setError(`Add your “Other” ${preference.label.toLowerCase()} to continue.`)
        return
      }
    }
    const toPreferenceList = (value: string, other: string) => {
      const values = toList(value)
      const hasOther = values.some((item) => item.toLowerCase() === 'other')
      return [...values.filter((item) => item.toLowerCase() !== 'other'), ...(hasOther ? [other.trim()] : [])]
    }
    setIsSaving(true)
    try {
      const updated = await apiRequest<UserProfile>('/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          age: Number(form.age),
          gender: form.gender,
          goals: toList(form.goals),
          activity_level: form.activity_level,
          lifestyle_summary: form.lifestyle_summary.trim(),
          dietary_preferences: toPreferenceList(form.dietary_preferences, otherFood),
          sleep_hours: form.sleep_hours === '' ? null : Number(form.sleep_hours),
          exercise_preferences: toPreferenceList(form.exercise_preferences, otherExercise),
          preferred_activities: toPreferenceList(form.preferred_activities, otherPreferred),
          avoided_activities: toPreferenceList(form.avoided_activities, otherAvoided),
        }),
      })
      onCompleted(updated)
      navigate('/dashboard', { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save onboarding details.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="onboarding-screen">
      <div className="onboarding-heading">
        <p className="panel-kicker">A few details · Set up your profile</p>
        <h1>Make your wellness guide yours.</h1>
        <p className="text-copy">Share what matters to you. EvoTwin uses it to tailor suggestions, and you can change it any time.</p>
      </div>
      <form className="panel onboarding-form" onSubmit={(event) => void handleSubmit(event)}>
        <section className="onboarding-section">
          <h2>About you</h2>
          <div className="form-field-grid">
            <label>Name<input value={form.full_name} onChange={(event) => changeField('full_name', event.target.value)} required /></label>
            <label>Age<input type="number" min="0" max="120" value={form.age} onChange={(event) => changeField('age', event.target.value)} required /></label>
            <label>Gender<input value={form.gender} onChange={(event) => changeField('gender', event.target.value)} placeholder="For example, woman, man, or non-binary" required /></label>
            <label>Activity level<select value={form.activity_level} onChange={(event) => changeField('activity_level', event.target.value)} required>
              <option value="">Choose a level</option><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option><option value="variable">Varies</option>
            </select></label>
            <label>Typical sleep (hours)<input type="number" min="0" max="24" step="0.1" value={form.sleep_hours} onChange={(event) => changeField('sleep_hours', event.target.value)} required /></label>
            <ChoiceChips label="Food preferences" value={form.dietary_preferences} onChange={(value) => changeField('dietary_preferences', value)} options={['No restrictions', 'Vegetarian', 'Vegan', 'Dairy-free', 'Gluten-free', 'Halal', 'Kosher', 'Other', 'None']} />
            {form.dietary_preferences.split(',').some((item) => item.trim() === 'Other') && <label className="other-choice-field">Other food preference<input value={otherFood} onChange={(event) => setOtherFood(event.target.value)} placeholder="Add your preference" required /></label>}
          </div>
        </section>
        <section className="onboarding-section">
          <h2>Goals and routine</h2>
          <label>Health and well-being goals <span className="field-hint">Separate goals with commas</span><textarea rows={2} value={form.goals} onChange={(event) => changeField('goals', event.target.value)} placeholder="Improve fitness, sleep more consistently" required /></label>
          <label>Lifestyle information<textarea rows={3} value={form.lifestyle_summary} onChange={(event) => changeField('lifestyle_summary', event.target.value)} placeholder="Schedule, responsibilities, or routines that affect your well-being" required /></label>
          <ChoiceChips label="Exercise preferences" value={form.exercise_preferences} onChange={(value) => changeField('exercise_preferences', value)} options={['Walking', 'Running', 'Cycling', 'Swimming', 'Strength training', 'Yoga', 'Dance', 'Hiking', 'Other', 'None']} />
          {form.exercise_preferences.split(',').some((item) => item.trim() === 'Other') && <label className="other-choice-field">Other exercise preference<input value={otherExercise} onChange={(event) => setOtherExercise(event.target.value)} placeholder="Add an activity" required /></label>}
        </section>
        <section className="onboarding-section">
          <h2>Activities that fit you</h2>
          <div className="form-field-grid">
            <div>
              <ChoiceChips label="Activities you like" value={form.preferred_activities} onChange={(value) => changeField('preferred_activities', value)} options={['Walking', 'Running', 'Cycling', 'Swimming', 'Strength training', 'Yoga', 'Dance', 'Hiking', 'Other', 'None']} />
              {form.preferred_activities.split(',').some((item) => item.trim() === 'Other') && <label className="other-choice-field">Other activity you like<input value={otherPreferred} onChange={(event) => setOtherPreferred(event.target.value)} placeholder="Add an activity" required /></label>}
            </div>
            <div>
              <ChoiceChips label="Activities you want to avoid" value={form.avoided_activities} onChange={(value) => changeField('avoided_activities', value)} options={['Walking', 'Running', 'Cycling', 'Swimming', 'Strength training', 'Yoga', 'Dance', 'Hiking', 'Other', 'None']} />
              {form.avoided_activities.split(',').some((item) => item.trim() === 'Other') && <label className="other-choice-field">Other activity to avoid<input value={otherAvoided} onChange={(event) => setOtherAvoided(event.target.value)} placeholder="Add an activity" required /></label>}
            </div>
          </div>
        </section>
        {error && <p className="feedback-message feedback-error" role="alert">{error}</p>}
        <button type="submit" className="primary-btn" disabled={isSaving}>{isSaving ? 'Saving your details…' : 'Finish setup'} <ArrowRight size={17} /></button>
      </form>
    </div>
  )
}

function ChoiceChips({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  const selected = value.split(',').map((item) => item.trim()).filter(Boolean)

  const toggleOption = (option: string) => {
    if (option === 'None') {
      onChange(selected.includes('None') ? '' : 'None')
      return
    }
    const otherOptions = selected.filter((item) => item !== 'None')
    onChange(otherOptions.includes(option)
      ? otherOptions.filter((item) => item !== option).join(', ')
      : [...otherOptions, option].join(', '))
  }

  return (
    <fieldset className="choice-field">
      <legend>{label}</legend>
      <div className="choice-chips">
        {options.map((option) => (
          <button
            type="button"
            className={`choice-chip ${selected.includes(option) ? 'choice-chip-selected' : ''}`}
            aria-pressed={selected.includes(option)}
            key={option}
            onClick={() => toggleOption(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function DashboardPage({ currentUser }: { currentUser: UserProfile }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    apiRequest<DashboardSummary>('/dashboard/summary').then((result) => {
      if (isMounted) setSummary(result)
    }).catch((requestError: unknown) => {
      if (isMounted) setError(requestError instanceof Error ? requestError.message : 'Unable to load dashboard summary.')
    })
    return () => { isMounted = false }
  }, [])

  const latest = summary?.latest_log
  return (
    <div className="page-stack">
      <div className="stats-grid">
        <StatBox label="Wellness score" value={latest?.wellness_index == null ? '—' : `${latest.wellness_index} / 100`} sub={latest ? `Latest · ${latest.date}` : 'Add a journal entry to begin'} />
        <StatBox label="Sleep" value={latest?.sleep_hours == null ? '—' : `${latest.sleep_hours}h`} sub="Latest journal entry" />
        <StatBox label="Activity" value={latest?.steps == null ? '—' : latest.steps.toLocaleString()} sub="Latest steps" />
        <StatBox label="Stress" value={latest?.stress_level == null ? '—' : `${latest.stress_level} / 100`} sub="Latest self-report" />
      </div>

      <div className="content-grid two-up">
        <Panel title={`Welcome, ${currentUser.full_name}`}>
          <p className="text-copy">Your profile includes {summary?.log_count ?? 0} journal entries and {summary?.session_count ?? 0} conversations. EvoTwin uses these details to make its suggestions more relevant.</p>
          <h4 className="dashboard-subheading">Current goals</h4>
          {summary?.goals.length ? <ContextList title="" items={summary.goals} /> : <p className="text-copy">Your wellness goals will appear here.</p>}
          {error && <p className="feedback-message feedback-error" role="alert">{error}</p>}
        </Panel>

        <Panel title="Recent changes">
          {summary?.recent_updates.length ? (
            <div className="list-block">
              {summary.recent_updates.map((update) => <div className="check-item" key={update.id}><Clock3 size={16} /><span>{update.summary}</span></div>)}
            </div>
          ) : <p className="text-copy">Updates to your profile and preferences will appear here.</p>}
        </Panel>
      </div>

      <section className="dashboard-shortcuts" aria-label="Your wellness workspace">
        {[
          { to: '/chat', title: 'Wellness assistant', description: 'Ask a question and see what shaped the answer.' },
          { to: '/twin', title: 'My profile', description: 'Review your details and saved preferences.' },
          { to: '/health', title: 'Health journal', description: 'Record how you are doing each day.' },
          { to: '/insights', title: 'Your progress', description: 'See recent patterns and try different daily values.' },
          { to: '/settings', title: 'Settings', description: 'Manage your details, privacy, and account.' },
        ].map((shortcut) => (
          <NavLink className="dashboard-shortcut" to={shortcut.to} key={shortcut.to}>
            <strong>{shortcut.title}</strong><span>{shortcut.description}</span><ArrowRight size={17} />
          </NavLink>
        ))}
      </section>
    </div>
  )
}

function TwinPage() {
  const [twin, setTwin] = useState<DigitalTwin | null>(null)
  const [memoryContent, setMemoryContent] = useState('')
  const [memoryCategory, setMemoryCategory] = useState('mood')
  const [isLoading, setIsLoading] = useState(true)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  const loadTwin = async () => {
    const data = await apiRequest<DigitalTwin>('/twin')
    setTwin(data)
  }

  useEffect(() => {
    let isMounted = true
    apiRequest<DigitalTwin>('/twin').then((data) => {
      if (isMounted) setTwin(data)
    }).catch((loadError: unknown) => {
      if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load your profile.')
    }).finally(() => {
      if (isMounted) setIsLoading(false)
    })
    return () => { isMounted = false }
  }, [])

  const addSessionMemory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!memoryContent.trim()) return
    setError('')
    try {
      await apiRequest<TwinMemory>('/memory', {
        method: 'POST',
        body: JSON.stringify({ category: memoryCategory, content: memoryContent.trim(), memory_type: 'session', source: 'user_input', confidence: 0.7, importance: 0.5 }),
      })
      setMemoryContent('')
      setFeedback('Session note saved for current interactions.')
      await loadTwin()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save your note.')
    }
  }

  const clearSessionMemory = async () => {
    setError('')
    try {
      await apiRequest<{ status: string; count: number }>('/memory/session', { method: 'DELETE' })
      setFeedback('Notes for today cleared.')
      await loadTwin()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to clear today’s notes.')
    }
  }

  const profile = twin?.profile
  return (
    <div className="page-stack twin-page">
      <div className="twin-page-heading"><div><p className="panel-kicker">Your information</p><h1>My profile</h1><p className="text-copy">Review the details and preferences EvoTwin uses to tailor suggestions.</p></div><NavLink to="/settings" className="ghost-btn">Edit profile</NavLink></div>
      {error && <p className="feedback-message feedback-error" role="alert">{error}</p>}
      {isLoading ? <p className="text-copy">Loading your profile…</p> : twin && (
        <>
          <div className="content-grid two-up">
            <Panel title="About you">
              <dl className="twin-details">
                <div><dt>Name</dt><dd>{profile?.full_name || '—'}</dd></div>
                <div><dt>Age</dt><dd>{profile?.age ?? '—'}</dd></div>
                <div><dt>Gender</dt><dd>{profile?.gender || '—'}</dd></div>
                <div><dt>Goals</dt><dd>{twin.goals.join(', ') || 'No goals yet'}</dd></div>
              </dl>
            </Panel>
            <Panel title="Health and daily routine">
              <dl className="twin-details">
                <div><dt>Activity level</dt><dd>{profile?.activity_level || '—'}</dd></div>
                <div><dt>Typical sleep</dt><dd>{profile?.sleep_hours == null ? '—' : `${profile.sleep_hours} hours`}</dd></div>
                <div><dt>Diet</dt><dd>{profile?.dietary_preferences.join(', ') || '—'}</dd></div>
                <div><dt>Lifestyle</dt><dd>{profile?.lifestyle_summary || '—'}</dd></div>
              </dl>
            </Panel>
            <Panel title="Activities you like or avoid">
              <dl className="twin-details">
                <div><dt>Preferred activities</dt><dd>{profile?.preferred_activities.join(', ') || '—'}</dd></div>
                <div><dt>Exercise preferences</dt><dd>{profile?.exercise_preferences.join(', ') || '—'}</dd></div>
                <div><dt>Avoided activities</dt><dd>{profile?.avoided_activities.join(', ') || '—'}</dd></div>
              </dl>
            </Panel>
            <Panel title="Saved preferences">
              <p className="text-copy">These are details you’ve shared for EvoTwin to remember in future conversations.</p>
              {twin.long_term_memories.length ? <MemoryList memories={twin.long_term_memories} /> : <p className="text-copy">Nothing saved yet.</p>}
            </Panel>
          </div>
          <Panel title="Notes for today">
            <div className="session-memory-toolbar">
              <p className="text-copy">These notes help with current conversations and are removed automatically after 24 hours.</p>
              <button className="ghost-btn danger" type="button" onClick={() => void clearSessionMemory()} disabled={twin.session_memories.length === 0}>Clear today’s notes</button>
            </div>
            <form className="session-memory-form" onSubmit={(event) => void addSessionMemory(event)}>
              <label>What is it about?<select value={memoryCategory} onChange={(event) => setMemoryCategory(event.target.value)}><option value="mood">How I feel</option><option value="activity">What I did today</option><option value="sleep">How I slept</option><option value="symptom">A health concern</option><option value="goal">A goal for today</option><option value="meal">What I ate</option></select></label>
              <label>Your note<input value={memoryContent} onChange={(event) => setMemoryContent(event.target.value)} placeholder="I slept about five hours last night" /></label>
              <button className="primary-btn" type="submit" disabled={!memoryContent.trim()}>Save note</button>
            </form>
            {twin.session_memories.length ? <MemoryList memories={twin.session_memories} /> : <p className="text-copy">No notes for today yet.</p>}
            {feedback && <p className="feedback-message feedback-success" role="status">{feedback}</p>}
          </Panel>
        </>
      )}
    </div>
  )
}

const memoryCategoryNames: Record<string, string> = {
  goal: 'Goal',
  dietary_preference: 'Food preference',
  exercise_preference: 'Activity preference',
  preferred_activity: 'Activity you like',
  avoided_activity: 'Activity to avoid',
  preferred_activities: 'Activities you like',
  avoided_activities: 'Activities to avoid',
  activity_level: 'Usual activity level',
  sleep_preference: 'Sleep',
  lifestyle: 'Daily routine',
  mood: 'How you feel',
  symptom: 'Health concern',
  current_feedback: 'Your note',
}

function memoryCategoryLabel(category: string) {
  return memoryCategoryNames[category] ?? category.replaceAll('_', ' ')
}

function MemoryList({ memories }: { memories: TwinMemory[] }) {
  return (
    <div className="memory-list">
      {memories.map((memory) => <article className="memory-entry" key={memory.id}><div><strong>{memoryCategoryLabel(memory.category)}</strong><p>{memory.content}</p></div><time>{new Date(memory.created_at).toLocaleDateString()}</time></article>)}
    </div>
  )
}

function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [answer, setAnswer] = useState<ChatAnswer | null>(null)
  const [contextUsed, setContextUsed] = useState<ChatAnswer['context_used']>([])
  const [showContext, setShowContext] = useState(false)
  const [feedbackRating, setFeedbackRating] = useState<'helpful' | 'not_helpful'>('helpful')
  const [correction, setCorrection] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [isSendingFeedback, setIsSendingFeedback] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    const loadSessions = async () => {
      try {
        const result = await apiRequest<ChatSession[]>('/chat/sessions')
        if (!isMounted) return
        setSessions(result)
        if (result.length > 0) {
          setActiveSessionId(result[0].id)
          const conversation = await apiRequest<{ messages: ChatMessage[] }>(
            `/chat/sessions/${result[0].id}`,
          )
          if (isMounted) {
            setMessages(conversation.messages)
            setContextUsed([...conversation.messages].reverse().find((message) => message.role === 'assistant')?.context_used ?? [])
          }
        }
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load conversations.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void loadSessions()
    return () => { isMounted = false }
  }, [])

  const startNewConversation = () => {
    setActiveSessionId('')
    setMessages([])
    setAnswer(null)
    setContextUsed([])
    setShowContext(false)
    setFeedbackMessage('')
    setError('')
  }

  const handleSessionChange = async (sessionId: string) => {
    if (!sessionId) {
      startNewConversation()
      return
    }
    setActiveSessionId(sessionId)
    setAnswer(null)
    setIsLoading(true)
    setError('')
    try {
      const conversation = await apiRequest<{ messages: ChatMessage[] }>(`/chat/sessions/${sessionId}`)
      setMessages(conversation.messages)
      setContextUsed([...conversation.messages].reverse().find((message) => message.role === 'assistant')?.context_used ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load this conversation.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || isSending) return
    setIsSending(true)
    setError('')

    try {
      let sessionId = activeSessionId
      if (!sessionId) {
        const session = await apiRequest<ChatSession>('/chat/sessions', {
          method: 'POST',
          body: JSON.stringify({ title: content.slice(0, 48) }),
        })
        sessionId = session.id
        setActiveSessionId(sessionId)
      }

      const result = await apiRequest<ChatAnswer>(`/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      })
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      }
      setMessages((current) => [...current, userMessage, result.message])
      setAnswer(result)
      setContextUsed(result.context_used)
      setShowContext(false)
      setFeedbackMessage('')
      setDraft('')
      const updatedSessions = await apiRequest<ChatSession[]>('/chat/sessions')
      setSessions(updatedSessions)
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send your message.')
    } finally {
      setIsSending(false)
    }
  }

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeSessionId || isSendingFeedback) return
    setIsSendingFeedback(true)
    setFeedbackMessage('')
    try {
      const result = await apiRequest<{ applied_changes: { category: string; activity: string }[]; memory_type?: string | null }>(
        `/chat/sessions/${activeSessionId}/feedback`,
        { method: 'POST', body: JSON.stringify({ rating: feedbackRating, correction: correction.trim() || null }) },
      )
      setFeedbackMessage(result.applied_changes.length
        ? `Your preferences were updated: ${result.applied_changes.map((change) => change.category === 'avoided_activities' ? `${change.activity} marked as something to avoid` : `${change.activity} added to activities you like`).join('; ')}.`
        : correction.trim() ? 'Your note was saved for today and may help with this conversation.' : 'Thanks, your feedback was recorded.')
      setCorrection('')
    } catch (feedbackError) {
      setFeedbackMessage(feedbackError instanceof Error ? feedbackError.message : 'Unable to record feedback.')
    } finally {
      setIsSendingFeedback(false)
    }
  }

  return (
    <div className="content-grid two-up chat-layout">
      <div className="panel chat-panel">
        <div className="panel-header-row">
          <div>
            <p className="panel-kicker">EvoTwin assistant</p>
            <h2>Ask about your well-being</h2>
          </div>
          <button type="button" className="ghost-btn" onClick={startNewConversation}>
            <Plus size={16} /> New conversation
          </button>
        </div>

        <label className="session-picker">
          <span>Past conversations</span>
          <select value={activeSessionId} onChange={(event) => void handleSessionChange(event.target.value)}>
            <option value="">New conversation</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>{session.title}</option>
            ))}
          </select>
        </label>

        <div className="message-stream">
          {isLoading && <p className="empty-state">Loading conversation…</p>}
          {!isLoading && messages.length === 0 && (
            <p className="empty-state">Ask about sleep, activity, stress, or routines to get started.</p>
          )}
          {messages.map((message) => (
            <div key={message.id} className={`bubble ${message.role === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
              {message.content}
            </div>
          ))}
          {isSending && <p className="empty-state">Preparing a response…</p>}
        </div>

        {error && <p className="feedback-message feedback-error" role="alert">{error}</p>}
        <form className="composer" onSubmit={(event) => void handleSend(event)}>
          <input
            aria-label="Message the wellness coach"
            placeholder="Ask about sleep, stress, or habits"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={isSending}
          />
          <button type="submit" className="primary-btn" disabled={isSending || !draft.trim()}>
            {isSending ? 'Sending…' : 'Send'}
          </button>
        </form>
      </div>

      <div className="panel response-context">
        <h3>Why this answer?</h3>
        {answer ? (
          <>
            {answer.personalized_observations.length > 0 && <ContextList title="About your question" items={answer.personalized_observations} />}
            {answer.recommendations.length > 0 && <ContextList title="Ideas you can try" items={answer.recommendations} />}
            <p className="text-copy">{answer.rationale}</p>
            {answer.evidence_sources.length > 0 && (
              <ContextList title="Information sources" items={answer.evidence_sources.map((source) => source.title ?? source.source ?? 'Reference')} />
            )}
            <p className="safety-note">{answer.safety_notice}</p>
            <p className="text-copy">{answer.uncertainty}</p>
            <button className="ghost-btn context-toggle" type="button" aria-expanded={showContext} onClick={() => setShowContext((visible) => !visible)}>
              {showContext ? 'Hide details' : 'What shaped this answer?'}
            </button>
            {showContext && (
              <div className="used-context-list">
                {contextUsed.length ? contextUsed.map((item, index) => (
                  <div className="used-context-item" key={`${item.label}-${index}`}><strong>{item.label}</strong><span>{item.value}</span><small>{({ profile: 'Your profile', 'recent journal': 'Your journal', 'long-term memory': 'Saved preferences', 'session memory': 'Notes for today', 'current conversation': 'This conversation' } as Record<string, string>)[item.source] ?? item.source}</small></div>
                )) : <p className="text-copy">I didn’t use any saved details for this question.</p>}
              </div>
            )}
            <form className="response-feedback" onSubmit={(event) => void submitFeedback(event)}>
              <h4>Was this answer useful?</h4>
              <div className="feedback-rating" role="group" aria-label="Rate the answer">
                <button type="button" className={feedbackRating === 'helpful' ? 'feedback-rating-active' : ''} onClick={() => setFeedbackRating('helpful')}>Yes</button>
                <button type="button" className={feedbackRating === 'not_helpful' ? 'feedback-rating-active' : ''} onClick={() => setFeedbackRating('not_helpful')}>Not quite</button>
              </div>
              <label>Correct or add information<textarea rows={2} value={correction} onChange={(event) => setCorrection(event.target.value)} placeholder="For example: I don’t like yoga; I prefer cycling." /></label>
              {feedbackMessage && <p className="feedback-message" role="status">{feedbackMessage}</p>}
              <button className="ghost-btn" type="submit" disabled={isSendingFeedback}>{isSendingFeedback ? 'Sending…' : 'Send feedback'}</button>
            </form>
          </>
        ) : (
          <p className="text-copy">Your answer and the details that shaped it will appear here.</p>
        )}
      </div>
    </div>
  )
}

function ContextList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="context-section">
      <h4>{title}</h4>
      <ul className="bullet-list">{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul>
    </section>
  )
}

function HealthPage() {
  const [logs, setLogs] = useState<HealthLog[]>([])
  const [summary, setSummary] = useState<WellnessSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [feedbackIsError, setFeedbackIsError] = useState(false)

  useEffect(() => {
    let isMounted = true
    Promise.all([
      apiRequest<HealthLog[]>('/health/logs'),
      apiRequest<WellnessSummary>('/health/summary'),
    ]).then(([loadedLogs, loadedSummary]) => {
      if (isMounted) {
        setLogs(loadedLogs)
        setSummary(loadedSummary)
      }
    }).catch((loadError: unknown) => {
      if (isMounted) {
        setFeedback(loadError instanceof Error ? loadError.message : 'Unable to load your health journal.')
        setFeedbackIsError(true)
      }
    }).finally(() => {
      if (isMounted) setIsLoading(false)
    })
    return () => { isMounted = false }
  }, [])

  const handleSaveLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setFeedback('')
    setFeedbackIsError(false)
    const form = event.currentTarget
    const formData = new FormData(form)
    const payload: Record<string, string | number> = {}
    const date = String(formData.get('date') ?? '')
    if (date) payload.date = date
    for (const field of ['sleep_hours', 'steps', 'hydration_liters', 'nutrition_score', 'stress_level']) {
      const value = String(formData.get(field) ?? '')
      if (value !== '') payload[field] = Number(value)
    }
    const notes = String(formData.get('notes') ?? '').trim()
    if (notes) payload.notes = notes
    if (Object.keys(payload).length === (date ? 1 : 0)) {
      setFeedback('Add at least one wellness measurement before saving.')
      setFeedbackIsError(true)
      setIsSaving(false)
      return
    }

    try {
      const created = await apiRequest<HealthLog>('/health/logs', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const updatedSummary = await apiRequest<WellnessSummary>('/health/summary')
      setLogs((current) => [created, ...current].sort((a, b) => b.date.localeCompare(a.date)))
      setSummary(updatedSummary)
      form.reset()
      setFeedback('Journal entry saved.')
    } catch (saveError) {
      setFeedback(saveError instanceof Error ? saveError.message : 'Unable to save your entry.')
      setFeedbackIsError(true)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="content-grid two-up">
      <Panel title="How are you doing today?">
        <form className="stacked-form compact-form data-form" onSubmit={(event) => void handleSaveLog(event)}>
          <label>Date<input name="date" type="date" defaultValue={new Date().toLocaleDateString('en-CA')} /></label>
          <div className="form-field-grid">
            <label>Sleep (hours)<input name="sleep_hours" type="number" min="0" max="24" step="0.1" placeholder="7.5" /></label>
            <label>Steps<input name="steps" type="number" min="0" max="50000" step="1" placeholder="8000" /></label>
            <label>Water (L)<input name="hydration_liters" type="number" min="0" max="15" step="0.1" placeholder="2.0" /></label>
            <label>Nutrition (0-100)<input name="nutrition_score" type="number" min="0" max="100" step="1" placeholder="70" /></label>
            <label>Stress (0-100)<input name="stress_level" type="number" min="0" max="100" step="1" placeholder="40" /></label>
          </div>
          <label>Notes<textarea name="notes" rows={3} placeholder="Anything useful about today" /></label>
          {feedback && <p className={`feedback-message ${feedbackIsError ? 'feedback-error' : 'feedback-success'}`} role={feedbackIsError ? 'alert' : 'status'}>{feedback}</p>}
          <button type="submit" className="primary-btn wide-btn" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save entry'}
          </button>
        </form>
      </Panel>

      <div className="page-stack journal-history">
        <div className="stats-grid journal-summary">
          <StatBox label="Latest score" value={summary ? `${summary.latest_index}` : '—'} sub="Out of 100" />
          <StatBox label="Average score" value={summary ? `${summary.average_index}` : '—'} sub="Across saved entries" />
        </div>
        <Panel title="Recent entries">
          {isLoading ? <p className="text-copy">Loading journal…</p> : logs.length === 0 ? (
            <p className="text-copy">No entries yet. Your saved wellness logs will appear here.</p>
          ) : (
            <div className="journal-list">
              {logs.slice(0, 10).map((log) => (
                <article className="journal-entry" key={log.id}>
                  <div className="journal-entry-head"><strong>{log.date}</strong><span>{log.wellness_index ?? '—'} / 100</span></div>
                  <p>{[
                    log.sleep_hours != null && `${log.sleep_hours}h sleep`,
                    log.steps != null && `${log.steps.toLocaleString()} steps`,
                    log.hydration_liters != null && `${log.hydration_liters}L water`,
                    log.stress_level != null && `stress ${log.stress_level}`,
                  ].filter(Boolean).join(' · ') || 'Wellness note'}</p>
                  {log.notes && <p>{log.notes}</p>}
                </article>
              ))}
            </div>
          )}
        </Panel>
        <p className="text-copy methodology-note">Your scores are simple estimates based on what you record. They are not a medical assessment.</p>
      </div>
    </div>
  )
}

function InsightsPage() {
  const [logs, setLogs] = useState<HealthLog[]>([])
  const [history, setHistory] = useState<TwinHistoryEvent[]>([])
  const [summary, setSummary] = useState<WellnessSummary | null>(null)
  const [scenario, setScenario] = useState<ScenarioValues>({
    sleep_hours: 7,
    steps: 8000,
    hydration_liters: 2.2,
    nutrition_score: 70,
    stress_level: 45,
  })
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [error, setError] = useState('')
  const [modelNotice, setModelNotice] = useState('')

  useEffect(() => {
    let isMounted = true
    Promise.all([
      apiRequest<HealthLog[]>('/health/logs'),
      apiRequest<WellnessSummary>('/health/summary'),
      apiRequest<TwinHistoryEvent[]>('/twin/history'),
    ]).then(([loadedLogs, loadedSummary, twinHistory]) => {
      if (!isMounted) return
      setLogs(loadedLogs)
      setSummary(loadedSummary)
      setHistory(twinHistory)
      const latest = loadedLogs[0]
      if (latest) {
        setScenario((current) => ({
          sleep_hours: latest.sleep_hours ?? current.sleep_hours,
          steps: latest.steps ?? current.steps,
          hydration_liters: latest.hydration_liters ?? current.hydration_liters,
          nutrition_score: latest.nutrition_score ?? current.nutrition_score,
          stress_level: latest.stress_level ?? current.stress_level,
        }))
      }
    }).catch((loadError: unknown) => {
      if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load insights.')
    }).finally(() => {
      if (isMounted) setIsLoading(false)
    })
    return () => { isMounted = false }
  }, [])

  const handleScenarioChange = (field: keyof ScenarioValues, value: string) => {
    setScenario((current) => ({ ...current, [field]: Number(value) }))
  }

  const handleSimulate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsCalculating(true)
    setError('')
    setModelNotice('')
    try {
      const result = await apiRequest<PredictionResult>('/predict/what-if', {
        method: 'POST',
        body: JSON.stringify(scenario),
      })
      setPrediction(result)
      if (result.status === 'missing_model') setModelNotice(result.message ?? 'Wellness estimates need to be set up first.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to calculate this scenario.')
    } finally {
      setIsCalculating(false)
    }
  }

  const handleTrainModel = async () => {
    setIsTraining(true)
    setError('')
    try {
      await apiRequest<Record<string, unknown>>('/predict/train', { method: 'POST' })
      setModelNotice('Estimates are ready. Try your daily values again.')
      setPrediction(null)
    } catch (trainError) {
      setError(trainError instanceof Error ? trainError.message : 'Unable to set up estimates.')
    } finally {
      setIsTraining(false)
    }
  }

  const chartLogs = [...logs].slice(0, 7).reverse()

  return (
    <div className="page-stack">
      <div className="stats-grid insight-summary">
        <StatBox label="Latest score" value={summary ? `${summary.latest_index}` : '—'} sub="Out of 100" />
        <StatBox label="Average score" value={summary ? `${summary.average_index}` : '—'} sub={`${logs.length} saved entries`} />
        <StatBox label="Journal details" value={summary ? `${Math.round(summary.completeness * 100)}%` : '—'} sub="Average details recorded" />
        <StatBox label="Profile changes" value={String(history.length)} sub="Recent updates" />
      </div>

      <div className="content-grid two-up">
        <Panel title="Your wellness scores">
          {isLoading ? <p className="text-copy">Loading your recent scores…</p> : chartLogs.length === 0 ? (
            <p className="text-copy">Add journal entries to see how your scores change over time.</p>
          ) : (
            <div className="trend-chart" role="img" aria-label="Wellness scores for recent journal entries">
              {chartLogs.map((log) => (
                <div className="trend-column" key={log.id}>
                  <span className="trend-value">{Math.round(log.wellness_index ?? 0)}</span>
                  <div className="trend-track"><span style={{ height: `${Math.max(3, Math.min(100, log.wellness_index ?? 0))}%` }} /></div>
                  <time dateTime={log.date}>{log.date.slice(5)}</time>
                </div>
              ))}
            </div>
          )}
          <p className="text-copy insight-footnote"><Gauge size={15} /> Scores summarize self-reported wellness data and are not medical assessments.</p>
        </Panel>

        <Panel title="Try a different day">
          <p className="text-copy">Change the daily values to see how they might affect your estimated score. This is for learning, not medical advice.</p>
          <form className="scenario-form" onSubmit={(event) => void handleSimulate(event)}>
            <label>Sleep (hours)<input type="number" min="0" max="24" step="0.1" value={scenario.sleep_hours} onChange={(event) => handleScenarioChange('sleep_hours', event.target.value)} required /></label>
            <label>Steps<input type="number" min="0" max="50000" step="1" value={scenario.steps} onChange={(event) => handleScenarioChange('steps', event.target.value)} required /></label>
            <label>Hydration (L)<input type="number" min="0" max="15" step="0.1" value={scenario.hydration_liters} onChange={(event) => handleScenarioChange('hydration_liters', event.target.value)} required /></label>
            <label>Nutrition (0-100)<input type="number" min="0" max="100" value={scenario.nutrition_score} onChange={(event) => handleScenarioChange('nutrition_score', event.target.value)} required /></label>
            <label>Stress (0-100)<input type="number" min="0" max="100" value={scenario.stress_level} onChange={(event) => handleScenarioChange('stress_level', event.target.value)} required /></label>
            <button className="primary-btn" type="submit" disabled={isCalculating}>{isCalculating ? 'Working…' : 'See my estimate'}</button>
          </form>
          {prediction?.status === 'ok' && (
            <div className="prediction-result" role="status">
              <div><span>Typical estimate</span><strong>{prediction.baseline_estimate?.toFixed(1)}</strong></div>
              <div><span>Your estimate</span><strong>{prediction.scenario_estimate?.toFixed(1)}</strong></div>
              <p>{prediction.limitations}</p>
            </div>
          )}
          {modelNotice && <div className="model-notice"><p>{modelNotice}</p><button className="ghost-btn" type="button" onClick={() => void handleTrainModel()} disabled={isTraining}>{isTraining ? 'Setting up…' : 'Set up estimates'}</button></div>}
          {error && <p className="feedback-message feedback-error" role="alert">{error}</p>}
        </Panel>
      </div>
      <Panel title="Changes to your profile">
        {history.length ? (
          <div className="personalization-history">
            {history.slice(0, 10).map((event) => (
              <article className="history-event" key={event.id}>
                <span className="history-marker" aria-hidden="true" />
                <div><strong>{event.summary}</strong><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time></div>
              </article>
            ))}
          </div>
        ) : <p className="text-copy">Changes you make during setup and conversations will appear here.</p>}
      </Panel>
    </div>
  )
}

function SettingsPage({ onSignOut }: { onSignOut: () => void }) {
  const [profile, setProfile] = useState<ProfileForm>({
    full_name: '',
    age: '',
    gender: '',
    occupation: '',
    activity_level: '',
    goals: '',
    dietary_preferences: '',
    activity_preferences: '',
    exercise_preferences: '',
    preferred_activities: '',
    avoided_activities: '',
    sleep_hours: '',
    health_history: '',
    lifestyle_summary: '',
  })
  const [email, setEmail] = useState('')
  const [memories, setMemories] = useState<TwinMemory[]>([])
  const [memoryCategory, setMemoryCategory] = useState('routine')
  const [memoryContent, setMemoryContent] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [feedbackIsError, setFeedbackIsError] = useState(false)

  useEffect(() => {
    let isMounted = true
    Promise.all([
      apiRequest<UserProfile>('/auth/me'),
      apiRequest<TwinMemory[]>('/memory'),
    ]).then(([user, userMemories]) => {
      if (!isMounted) return
      setEmail(user.email)
      setProfile({
        full_name: user.full_name ?? '',
        age: user.age == null ? '' : String(user.age),
        gender: user.gender ?? '',
        occupation: user.occupation ?? '',
        activity_level: user.activity_level ?? '',
        goals: user.goals?.join(', ') ?? '',
        dietary_preferences: user.dietary_preferences?.join(', ') ?? '',
        activity_preferences: user.activity_preferences?.join(', ') ?? '',
        exercise_preferences: user.exercise_preferences?.join(', ') ?? '',
        preferred_activities: user.preferred_activities?.join(', ') ?? '',
        avoided_activities: user.avoided_activities?.join(', ') ?? '',
        sleep_hours: user.sleep_hours == null ? '' : String(user.sleep_hours),
        health_history: user.health_history ?? '',
        lifestyle_summary: user.lifestyle_summary ?? '',
      })
      setMemories(userMemories)
    }).catch((loadError: unknown) => {
      if (isMounted) {
        setFeedback(loadError instanceof Error ? loadError.message : 'Unable to load settings.')
        setFeedbackIsError(true)
      }
    }).finally(() => {
      if (isMounted) setIsLoading(false)
    })
    return () => { isMounted = false }
  }, [])

  const changeProfile = (field: keyof ProfileForm, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }))
  }

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setFeedback('')
    setFeedbackIsError(false)
    const toList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean)
    const payload = {
      full_name: profile.full_name.trim(),
      ...(profile.age ? { age: Number(profile.age) } : {}),
      gender: profile.gender.trim() || undefined,
      occupation: profile.occupation.trim() || undefined,
      activity_level: profile.activity_level.trim() || undefined,
      goals: toList(profile.goals),
      dietary_preferences: toList(profile.dietary_preferences),
      activity_preferences: toList(profile.activity_preferences),
      exercise_preferences: toList(profile.exercise_preferences),
      preferred_activities: toList(profile.preferred_activities),
      avoided_activities: toList(profile.avoided_activities),
      ...(profile.sleep_hours ? { sleep_hours: Number(profile.sleep_hours) } : {}),
      health_history: profile.health_history.trim() || undefined,
      lifestyle_summary: profile.lifestyle_summary.trim() || undefined,
    }
    try {
      const updated = await apiRequest<UserProfile>('/auth/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      setProfile((current) => ({ ...current, full_name: updated.full_name, age: updated.age == null ? '' : String(updated.age) }))
      setFeedback('Profile saved.')
    } catch (saveError) {
      setFeedback(saveError instanceof Error ? saveError.message : 'Unable to save profile.')
      setFeedbackIsError(true)
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = async () => {
    setFeedback('')
    try {
      const [user, logs, userMemories, sessions] = await Promise.all([
        apiRequest<UserProfile>('/auth/me'),
        apiRequest<HealthLog[]>('/health/logs'),
        apiRequest<TwinMemory[]>('/memory'),
        apiRequest<ChatSession[]>('/chat/sessions'),
      ])
      const exportBlob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), user, logs, memories: userMemories, conversations: sessions }, null, 2)], { type: 'application/json' })
      const downloadUrl = URL.createObjectURL(exportBlob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = 'evotwin-data-export.json'
      link.click()
      URL.revokeObjectURL(downloadUrl)
      setFeedback('Your data export has been downloaded.')
    } catch (exportError) {
      setFeedback(exportError instanceof Error ? exportError.message : 'Unable to export your data.')
      setFeedbackIsError(true)
    }
  }

  const handleAddMemory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!memoryContent.trim()) return
    setFeedback('')
    try {
      const memory = await apiRequest<TwinMemory>('/memory', {
        method: 'POST',
        body: JSON.stringify({ category: memoryCategory, content: memoryContent.trim(), memory_type: 'long_term', source: 'user_input', confidence: 0.7, importance: 0.6 }),
      })
      setMemories((current) => [memory, ...current])
      setMemoryContent('')
      setFeedback('Preference saved for future suggestions.')
      setFeedbackIsError(false)
    } catch (memoryError) {
      setFeedback(memoryError instanceof Error ? memoryError.message : 'Unable to save memory.')
      setFeedbackIsError(true)
    }
  }

  const handleRemoveMemory = async (memoryId: string) => {
    setFeedback('')
    try {
      await apiRequest<{ status: string }>(`/memory/${memoryId}`, { method: 'DELETE' })
      setMemories((current) => current.filter((memory) => memory.id !== memoryId))
      setFeedback('Preference removed from future suggestions.')
      setFeedbackIsError(false)
    } catch (memoryError) {
      setFeedback(memoryError instanceof Error ? memoryError.message : 'Unable to archive memory.')
      setFeedbackIsError(true)
    }
  }

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback('')
    setFeedbackIsError(false)
    if (newPassword !== confirmPassword) {
      setFeedback('New password and confirmation do not match.')
      setFeedbackIsError(true)
      return
    }
    try {
      await apiRequest<{ status: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setFeedback('Password changed. Your current session remains active.')
    } catch (passwordError) {
      setFeedback(passwordError instanceof Error ? passwordError.message : 'Unable to change password.')
      setFeedbackIsError(true)
    }
  }

  const handleClearSessionMemory = async () => {
    try {
      const result = await apiRequest<{ count: number }>('/memory/session', { method: 'DELETE' })
      setFeedback(`${result.count} note(s) for today cleared.`)
      setFeedbackIsError(false)
    } catch (clearError) {
      setFeedback(clearError instanceof Error ? clearError.message : 'Unable to clear today’s notes.')
      setFeedbackIsError(true)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account and associated wellness data? This cannot be undone.')) return
    setFeedback('')
    try {
      await apiRequest<{ status: string }>('/auth/me', { method: 'DELETE' })
      onSignOut()
    } catch (deleteError) {
      setFeedback(deleteError instanceof Error ? deleteError.message : 'Unable to delete your account.')
      setFeedbackIsError(true)
    }
  }

  return (
    <div className="page-stack settings-page">
      <div className="panel settings-panel">
        <p className="panel-kicker">Profile</p>
        <div className="settings-heading"><div><h2>Your wellness details</h2><p className="text-copy">EvoTwin uses these details to make suggestions more relevant.</p></div><span className="settings-email">{email}</span></div>
        {isLoading ? <p className="text-copy">Loading profile…</p> : (
          <form className="settings-form" onSubmit={(event) => void handleSaveProfile(event)}>
            <div className="form-field-grid">
              <label>Full name<input value={profile.full_name} onChange={(event) => changeProfile('full_name', event.target.value)} required /></label>
              <label>Age<input type="number" min="0" max="120" value={profile.age} onChange={(event) => changeProfile('age', event.target.value)} /></label>
              <label>Gender<input value={profile.gender} onChange={(event) => changeProfile('gender', event.target.value)} /></label>
              <label>Occupation<input value={profile.occupation} onChange={(event) => changeProfile('occupation', event.target.value)} /></label>
              <label>Activity level<input value={profile.activity_level} onChange={(event) => changeProfile('activity_level', event.target.value)} /></label>
              <label>Typical sleep (hours)<input type="number" min="0" max="24" step="0.1" value={profile.sleep_hours} onChange={(event) => changeProfile('sleep_hours', event.target.value)} /></label>
              <label>Goals <span className="field-hint">Separate with commas</span><input value={profile.goals} onChange={(event) => changeProfile('goals', event.target.value)} /></label>
              <label>Dietary preferences<input value={profile.dietary_preferences} onChange={(event) => changeProfile('dietary_preferences', event.target.value)} /></label>
              <label>Activity preferences<input value={profile.activity_preferences} onChange={(event) => changeProfile('activity_preferences', event.target.value)} /></label>
              <label>Exercise preferences<input value={profile.exercise_preferences} onChange={(event) => changeProfile('exercise_preferences', event.target.value)} /></label>
              <label>Preferred activities<input value={profile.preferred_activities} onChange={(event) => changeProfile('preferred_activities', event.target.value)} /></label>
              <label>Activities to avoid<input value={profile.avoided_activities} onChange={(event) => changeProfile('avoided_activities', event.target.value)} /></label>
            </div>
            <label>Health history<textarea rows={3} value={profile.health_history} onChange={(event) => changeProfile('health_history', event.target.value)} /></label>
            <label>Lifestyle summary<textarea rows={3} value={profile.lifestyle_summary} onChange={(event) => changeProfile('lifestyle_summary', event.target.value)} /></label>
            <button type="submit" className="primary-btn" disabled={isSaving}><Save size={16} />{isSaving ? 'Saving…' : 'Save profile'}</button>
          </form>
        )}
      </div>

      <div className="content-grid two-up settings-tools">
          <Panel title="Saved preferences">
          <form className="memory-form" onSubmit={(event) => void handleAddMemory(event)}>
            <label>Kind of detail<select value={memoryCategory} onChange={(event) => setMemoryCategory(event.target.value)}>
              <option value="routine">Daily routine</option><option value="goal">Goal</option><option value="preference">Preference</option><option value="context">Something else</option>
            </select></label>
            <label>What should EvoTwin remember?<textarea rows={2} value={memoryContent} onChange={(event) => setMemoryContent(event.target.value)} placeholder="A preference you want used in future suggestions" /></label>
            <button type="submit" className="ghost-btn" disabled={!memoryContent.trim()}><Plus size={16} /> Save preference</button>
          </form>
          {memories.length === 0 ? <p className="text-copy">No preferences saved yet.</p> : (
            <div className="memory-list">
              {memories.map((memory) => (
                <article className="memory-entry" key={memory.id}>
                  <div><strong>{memoryCategoryLabel(memory.category)}</strong><p>{memory.content}</p></div>
                  <button type="button" className="icon-btn" aria-label={`Archive memory: ${memory.content}`} title="Archive memory" onClick={() => void handleRemoveMemory(memory.id)}><Trash2 size={16} /></button>
                </article>
              ))}
            </div>
          )}
        </Panel>

        <div className="page-stack">
          <Panel title="Your information">
            <p className="text-copy">Download a copy of your profile, journal, saved preferences, and conversations.</p>
            <div className="settings-actions"><button type="button" className="ghost-btn" onClick={() => void handleExport()}><Download size={16} /> Download my information</button><button type="button" className="ghost-btn" onClick={() => void handleClearSessionMemory()}>Clear today’s notes</button></div>
          </Panel>
          <Panel title="Security">
            <form className="password-form" onSubmit={(event) => void handleChangePassword(event)}>
              <label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
              <label>New password<input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
              <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
              <button type="submit" className="ghost-btn">Change password</button>
            </form>
            <button type="button" className="sign-out-settings" onClick={onSignOut}><LogOut size={16} /> Sign out</button>
          </Panel>
          <Panel title="Delete account">
            <p className="text-copy">Permanently remove your account and all saved information.</p>
            <button type="button" className="ghost-btn danger" onClick={() => void handleDeleteAccount()}><Trash2 size={16} /> Delete my account</button>
          </Panel>
        </div>
      </div>
      {feedback && <p className={`feedback-message ${feedbackIsError ? 'feedback-error' : 'feedback-success'}`} role={feedbackIsError ? 'alert' : 'status'}>{feedback}</p>}
    </div>
  )
}

function MetricCard({
  icon,
  title,
  value,
  detail,
}: {
  icon: React.ReactNode
  title: string
  value: string
  detail: string
}) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div className="metric-title">{title}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">{detail}</div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel">
      <h3>{title}</h3>
      {children}
    </div>
  )
}

function StatBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="stat-box">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  )
}

export default App
