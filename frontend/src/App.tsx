import { useState, type FormEvent } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Clock3,
  Droplets,
  Dumbbell,
  Gauge,
  HeartPulse,
  LogOut,
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
          <Route path="/settings" element={<SettingsPage />} />
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
  return (
    <div className="content-grid two-up chat-layout">
      <div className="panel chat-panel">
        <div className="panel-header-row">
          <div>
            <p className="panel-kicker">AI assistant</p>
            <h2>Wellness coach</h2>
          </div>
          <span className="status-pill">Demo mode</span>
        </div>

        <div className="message-stream">
          <div className="bubble bubble-user">
            I am overloaded with classwork and need a sustainable fitness plan.
          </div>
          <div className="bubble bubble-ai">
            Your schedule suggests a lighter morning routine and a 20-minute evening
            recovery session might work better than pushing intensity.
          </div>
        </div>

        <div className="composer">
          <input placeholder="Ask about sleep, stress, or habits" />
          <button className="primary-btn">Send</button>
        </div>
      </div>

      <Panel title="Evidence and context">
        <ul className="bullet-list">
          <li>Sleep consistency supports better recovery capacity.</li>
          <li>Stress variability suggests a shorter training window.</li>
          <li>Recommendations remain educational and non-clinical.</li>
        </ul>
      </Panel>
    </div>
  )
}

function HealthPage() {
  return (
    <div className="content-grid two-up">
      <Panel title="Log daily wellness">
        <form className="stacked-form compact-form">
          <input placeholder="Sleep hours" />
          <input placeholder="Steps" />
          <input placeholder="Hydration (L)" />
          <button type="button" className="primary-btn wide-btn">
            Save entry
          </button>
        </form>
      </Panel>

      <Panel title="Methodology">
        <div className="text-copy">
          The wellness index blends sleep, hydration, movement, and stress into a
          normalized score. Missing data reduces confidence, while a consistent trend
          improves the twin’s understanding of your patterns.
        </div>
      </Panel>
    </div>
  )
}

function InsightsPage() {
  return (
    <div className="page-stack">
      <div className="content-grid two-up">
        <Panel title="Historical trend">
          <div className="insight-box">
            <Gauge size={18} />
            <span>Wellness consistency improved by 12% over the last 14 days.</span>
          </div>
        </Panel>

        <Panel title="What-if simulator">
          <div className="text-copy">
            Adjust sleep, hydration, and stress to preview a likely wellness outcome.
            The model shows the strongest gains from sleep quality and routine stability.
          </div>
        </Panel>
      </div>
    </div>
  )
}

function SettingsPage() {
  return (
    <div className="panel settings-panel">
      <p className="panel-kicker">Privacy & settings</p>
      <h2>Control your twin</h2>
      <div className="settings-list">
        <div className="setting-row">
          <span>Export health history</span>
          <button type="button" className="ghost-btn">Export</button>
        </div>
        <div className="setting-row">
          <span>Manage memory visibility</span>
          <button type="button" className="ghost-btn">Manage</button>
        </div>
        <div className="setting-row">
          <span>Delete account data</span>
          <button type="button" className="ghost-btn danger">Delete</button>
        </div>
      </div>
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
