import { useEffect, useState, type FormEvent } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
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
  { to: '/chat', label: 'AI Assistant' },
  { to: '/health', label: 'Health Journal' },
  { to: '/insights', label: 'Insights' },
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
  occupation?: string | null
  goals: string[]
  dietary_preferences: string[]
  activity_preferences: string[]
  health_history?: string | null
  lifestyle_summary?: string | null
}
type ProfileForm = {
  full_name: string
  age: string
  occupation: string
  goals: string
  dietary_preferences: string
  activity_preferences: string
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

function App() {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY))

  const handleAuthenticated = (token: string) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    setAccessToken(token)
  }

  const handleSignOut = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    setAccessToken(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={accessToken
            ? <Navigate to="/dashboard" replace />
            : <AuthPage onAuthenticated={handleAuthenticated} />}
        />
        <Route
          path="/*"
          element={accessToken
            ? <AuthenticatedApp onSignOut={handleSignOut} />
            : <Navigate to="/auth" replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}

function AuthenticatedApp({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand-wrap">
            <div className="brand-icon">
              <HeartPulse size={20} />
            </div>
            <div>
              <div className="brand-name">VitaTwin AI</div>
              <div className="brand-tag">Digital wellness companion</div>
            </div>
          </div>

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
            <button type="button" className="sign-out-btn" onClick={onSignOut}>
              <LogOut size={16} /> Sign out
            </button>
          </nav>
        </div>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/settings" element={<SettingsPage onSignOut={onSignOut} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function AuthPage({ onAuthenticated }: { onAuthenticated: (token: string) => void }) {
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
      const result = await response.json() as { access_token?: string; detail?: string }

      if (!response.ok) {
        throw new Error(result.detail ?? 'Unable to authenticate. Please try again.')
      }
      if (!result.access_token) {
        throw new Error('The server did not return an access token.')
      }

      onAuthenticated(result.access_token)
      navigate('/dashboard', { replace: true })
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
          <span>VitaTwin <strong>AI</strong></span>
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
            {mode === 'login' ? 'Sign in to VitaTwin' : 'Create your account'}
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

function DashboardPage() {
  return (
    <div className="page-stack">
      <div className="stats-grid">
        <StatBox label="Wellness Index" value="78 / 100" sub="Strong recovery" />
        <StatBox label="Sleep" value="7.4h" sub="Avg. nightly" />
        <StatBox label="Activity" value="8,500" sub="Daily steps" />
        <StatBox label="Stress" value="32" sub="Low-medium" />
      </div>

      <div className="content-grid two-up">
        <Panel title="Recovery trend">
          <div className="line-chart">
            <span className="point p1" />
            <span className="point p2" />
            <span className="point p3" />
            <span className="point p4" />
            <span className="point p5" />
          </div>
        </Panel>

        <Panel title="Daily focus">
          <div className="list-block">
            <div className="check-item">
              <Clock3 size={16} />
              <span>Schedule a 20-minute mobility block after lunch.</span>
            </div>
            <div className="check-item">
              <Droplets size={16} />
              <span>Hydration is trending below your target for 2 days.</span>
            </div>
            <div className="check-item">
              <Dumbbell size={16} />
              <span>Training load is stable and recovery is supportive.</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [answer, setAnswer] = useState<ChatAnswer | null>(null)
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
          if (isMounted) setMessages(conversation.messages)
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
      setDraft('')
      const updatedSessions = await apiRequest<ChatSession[]>('/chat/sessions')
      setSessions(updatedSessions)
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send your message.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="content-grid two-up chat-layout">
      <div className="panel chat-panel">
        <div className="panel-header-row">
          <div>
            <p className="panel-kicker">AI assistant</p>
            <h2>Wellness coach</h2>
          </div>
          <button type="button" className="ghost-btn" onClick={startNewConversation}>
            <Plus size={16} /> New chat
          </button>
        </div>

        <label className="session-picker">
          <span>Conversation</span>
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
            <p className="empty-state">Ask about sleep, movement, stress, or daily routines to begin.</p>
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
        <h3>Response context</h3>
        {answer ? (
          <>
            {answer.personalized_observations.length > 0 && <ContextList title="Observations" items={answer.personalized_observations} />}
            {answer.recommendations.length > 0 && <ContextList title="Suggestions" items={answer.recommendations} />}
            <p className="text-copy">{answer.rationale}</p>
            {answer.evidence_sources.length > 0 && (
              <ContextList title="Evidence" items={answer.evidence_sources.map((source) => source.title ?? source.source ?? 'Reference')} />
            )}
            <p className="safety-note">{answer.safety_notice}</p>
            <p className="text-copy">{answer.uncertainty}</p>
          </>
        ) : (
          <p className="text-copy">Personalized observations, recommendations, and evidence will appear here after a response.</p>
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
      <Panel title="Log daily wellness">
        <form className="stacked-form compact-form data-form" onSubmit={(event) => void handleSaveLog(event)}>
          <label>Date<input name="date" type="date" defaultValue={new Date().toLocaleDateString('en-CA')} /></label>
          <div className="form-field-grid">
            <label>Sleep (hours)<input name="sleep_hours" type="number" min="0" max="24" step="0.1" placeholder="7.5" /></label>
            <label>Steps<input name="steps" type="number" min="0" max="50000" step="1" placeholder="8000" /></label>
            <label>Hydration (L)<input name="hydration_liters" type="number" min="0" max="15" step="0.1" placeholder="2.0" /></label>
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
          <StatBox label="Latest index" value={summary ? `${summary.latest_index}` : '—'} sub="Out of 100" />
          <StatBox label="Average index" value={summary ? `${summary.average_index}` : '—'} sub="Across saved entries" />
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
        <p className="text-copy methodology-note">Wellness scores are educational estimates based on the information you record, not medical assessments.</p>
      </div>
    </div>
  )
}

function InsightsPage() {
  const [logs, setLogs] = useState<HealthLog[]>([])
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
    ]).then(([loadedLogs, loadedSummary]) => {
      if (!isMounted) return
      setLogs(loadedLogs)
      setSummary(loadedSummary)
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
      if (result.status === 'missing_model') setModelNotice(result.message ?? 'Train the synthetic model to run a scenario.')
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
      setModelNotice('Synthetic model trained. Run the scenario again to see an estimate.')
      setPrediction(null)
    } catch (trainError) {
      setError(trainError instanceof Error ? trainError.message : 'Unable to train the synthetic model.')
    } finally {
      setIsTraining(false)
    }
  }

  const chartLogs = [...logs].slice(0, 7).reverse()

  return (
    <div className="page-stack">
      <div className="stats-grid insight-summary">
        <StatBox label="Latest wellness" value={summary ? `${summary.latest_index}` : '—'} sub="Out of 100" />
        <StatBox label="Period average" value={summary ? `${summary.average_index}` : '—'} sub={`${logs.length} saved entries`} />
        <StatBox label="Data completeness" value={summary ? `${Math.round(summary.completeness * 100)}%` : '—'} sub="Across journal entries" />
      </div>

      <div className="content-grid two-up">
        <Panel title="Wellness history">
          {isLoading ? <p className="text-copy">Loading recorded trends…</p> : chartLogs.length === 0 ? (
            <p className="text-copy">Add journal entries to build your personal wellness trend.</p>
          ) : (
            <div className="trend-chart" role="img" aria-label="Wellness index for recent journal entries">
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

        <Panel title="What-if simulator">
          <p className="text-copy">Adjust your daily inputs to compare a synthetic wellness estimate against the model baseline.</p>
          <form className="scenario-form" onSubmit={(event) => void handleSimulate(event)}>
            <label>Sleep (hours)<input type="number" min="0" max="24" step="0.1" value={scenario.sleep_hours} onChange={(event) => handleScenarioChange('sleep_hours', event.target.value)} required /></label>
            <label>Steps<input type="number" min="0" max="50000" step="1" value={scenario.steps} onChange={(event) => handleScenarioChange('steps', event.target.value)} required /></label>
            <label>Hydration (L)<input type="number" min="0" max="15" step="0.1" value={scenario.hydration_liters} onChange={(event) => handleScenarioChange('hydration_liters', event.target.value)} required /></label>
            <label>Nutrition (0-100)<input type="number" min="0" max="100" value={scenario.nutrition_score} onChange={(event) => handleScenarioChange('nutrition_score', event.target.value)} required /></label>
            <label>Stress (0-100)<input type="number" min="0" max="100" value={scenario.stress_level} onChange={(event) => handleScenarioChange('stress_level', event.target.value)} required /></label>
            <button className="primary-btn" type="submit" disabled={isCalculating}>{isCalculating ? 'Calculating…' : 'Run scenario'}</button>
          </form>
          {prediction?.status === 'ok' && (
            <div className="prediction-result" role="status">
              <div><span>Baseline estimate</span><strong>{prediction.baseline_estimate?.toFixed(1)}</strong></div>
              <div><span>Scenario estimate</span><strong>{prediction.scenario_estimate?.toFixed(1)}</strong></div>
              <p>{prediction.limitations}</p>
            </div>
          )}
          {modelNotice && <div className="model-notice"><p>{modelNotice}</p><button className="ghost-btn" type="button" onClick={() => void handleTrainModel()} disabled={isTraining}>{isTraining ? 'Training…' : 'Train synthetic model'}</button></div>}
          {error && <p className="feedback-message feedback-error" role="alert">{error}</p>}
        </Panel>
      </div>
    </div>
  )
}

function SettingsPage({ onSignOut }: { onSignOut: () => void }) {
  const [profile, setProfile] = useState<ProfileForm>({
    full_name: '',
    age: '',
    occupation: '',
    goals: '',
    dietary_preferences: '',
    activity_preferences: '',
    health_history: '',
    lifestyle_summary: '',
  })
  const [email, setEmail] = useState('')
  const [memories, setMemories] = useState<TwinMemory[]>([])
  const [memoryCategory, setMemoryCategory] = useState('routine')
  const [memoryContent, setMemoryContent] = useState('')
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
        occupation: user.occupation ?? '',
        goals: user.goals?.join(', ') ?? '',
        dietary_preferences: user.dietary_preferences?.join(', ') ?? '',
        activity_preferences: user.activity_preferences?.join(', ') ?? '',
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
      occupation: profile.occupation.trim() || undefined,
      goals: toList(profile.goals),
      dietary_preferences: toList(profile.dietary_preferences),
      activity_preferences: toList(profile.activity_preferences),
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
      link.download = 'vitatwin-data-export.json'
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
      setFeedback('Memory saved to your twin.')
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
      setFeedback('Memory archived.')
      setFeedbackIsError(false)
    } catch (memoryError) {
      setFeedback(memoryError instanceof Error ? memoryError.message : 'Unable to archive memory.')
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
        <div className="settings-heading"><div><h2>Personal wellness profile</h2><p className="text-copy">Changes here personalize your digital twin.</p></div><span className="settings-email">{email}</span></div>
        {isLoading ? <p className="text-copy">Loading profile…</p> : (
          <form className="settings-form" onSubmit={(event) => void handleSaveProfile(event)}>
            <div className="form-field-grid">
              <label>Full name<input value={profile.full_name} onChange={(event) => changeProfile('full_name', event.target.value)} required /></label>
              <label>Age<input type="number" min="0" max="120" value={profile.age} onChange={(event) => changeProfile('age', event.target.value)} /></label>
              <label>Occupation<input value={profile.occupation} onChange={(event) => changeProfile('occupation', event.target.value)} /></label>
              <label>Goals <span className="field-hint">Separate with commas</span><input value={profile.goals} onChange={(event) => changeProfile('goals', event.target.value)} /></label>
              <label>Dietary preferences<input value={profile.dietary_preferences} onChange={(event) => changeProfile('dietary_preferences', event.target.value)} /></label>
              <label>Activity preferences<input value={profile.activity_preferences} onChange={(event) => changeProfile('activity_preferences', event.target.value)} /></label>
            </div>
            <label>Health history<textarea rows={3} value={profile.health_history} onChange={(event) => changeProfile('health_history', event.target.value)} /></label>
            <label>Lifestyle summary<textarea rows={3} value={profile.lifestyle_summary} onChange={(event) => changeProfile('lifestyle_summary', event.target.value)} /></label>
            <button type="submit" className="primary-btn" disabled={isSaving}><Save size={16} />{isSaving ? 'Saving…' : 'Save profile'}</button>
          </form>
        )}
      </div>

      <div className="content-grid two-up settings-tools">
        <Panel title="Digital twin memories">
          <form className="memory-form" onSubmit={(event) => void handleAddMemory(event)}>
            <label>Category<select value={memoryCategory} onChange={(event) => setMemoryCategory(event.target.value)}>
              <option value="routine">Routine</option><option value="goal">Goal</option><option value="preference">Preference</option><option value="context">Context</option>
            </select></label>
            <label>Memory<textarea rows={2} value={memoryContent} onChange={(event) => setMemoryContent(event.target.value)} placeholder="A preference or context you want your twin to remember" /></label>
            <button type="submit" className="ghost-btn" disabled={!memoryContent.trim()}><Plus size={16} /> Add memory</button>
          </form>
          {memories.length === 0 ? <p className="text-copy">No saved memories yet.</p> : (
            <div className="memory-list">
              {memories.map((memory) => (
                <article className="memory-entry" key={memory.id}>
                  <div><strong>{memory.category}</strong><p>{memory.content}</p></div>
                  <button type="button" className="icon-btn" aria-label={`Archive memory: ${memory.content}`} title="Archive memory" onClick={() => void handleRemoveMemory(memory.id)}><Trash2 size={16} /></button>
                </article>
              ))}
            </div>
          )}
        </Panel>

        <div className="page-stack">
          <Panel title="Privacy and data">
            <p className="text-copy">Export your profile, journal entries, saved memories, and conversation list.</p>
            <button type="button" className="ghost-btn" onClick={() => void handleExport()}><Download size={16} /> Export my data</button>
          </Panel>
          <Panel title="Delete account">
            <p className="text-copy">Permanently remove your account and its wellness data.</p>
            <button type="button" className="ghost-btn danger" onClick={() => void handleDeleteAccount()}><Trash2 size={16} /> Delete account data</button>
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
