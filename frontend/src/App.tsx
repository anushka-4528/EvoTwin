import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BellDot,
  BrainCircuit,
  Clock3,
  Droplets,
  Dumbbell,
  Gauge,
  HeartPulse,
  MoonStar,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import './App.css'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/auth', label: 'Auth' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/chat', label: 'AI Assistant' },
  { to: '/health', label: 'Health Journal' },
  { to: '/insights', label: 'Insights' },
  { to: '/settings', label: 'Settings' },
]

function App() {
  return (
    <BrowserRouter>
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
            </nav>
          </div>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/health" element={<HealthPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

function LandingPage() {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={14} /> EvoHealthTwin research framework
          </span>
          <h1>Wellness intelligence designed around your life.</h1>
          <p>
            Explore a personalized digital twin for health, behavior, and recovery.
            VitaTwin blends adaptive memory, wellness signals, and guided coaching
            to help users build better routines with confidence.
          </p>

          <div className="cta-row">
            <NavLink to="/auth" className="primary-btn">
              Get started <ArrowRight size={18} />
            </NavLink>
            <NavLink to="/dashboard" className="secondary-btn">
              View dashboard
            </NavLink>
          </div>

          <div className="mini-legend">
            <span>
              <ShieldCheck size={14} /> Responsible prototype
            </span>
            <span>
              <BrainCircuit size={14} /> Adaptive model
            </span>
          </div>
        </div>

        <div className="hero-visual">
          <MetricCard
            icon={<BrainCircuit size={20} />}
            title="Digital Twin"
            value="Adaptive memory"
            detail="Context-aware and habit-aware profile"
          />
          <MetricCard
            icon={<Activity size={20} />}
            title="Daily rhythm"
            value="78 / 100"
            detail="Sustainable performance index"
          />
          <MetricCard
            icon={<MoonStar size={20} />}
            title="Responsible AI"
            value="RPE + RAG"
            detail="Evidence-backed wellness prompts"
          />
        </div>
      </section>

      <section className="feature-grid">
        <FeatureCard
          icon={<Target size={18} />}
          title="Goal-focused planning"
          description="Turn health data into personalized, realistic recommendations for recovery, movement, and focus."
        />
        <FeatureCard
          icon={<TrendingUp size={18} />}
          title="Behavior forecasting"
          description="Use synthetic signals to spot changes in sleep, activity, and stress before they become patterns."
        />
        <FeatureCard
          icon={<BellDot size={18} />}
          title="Daily guidance"
          description="Deliver lightweight nudges and weekly check-ins with context rooted in the user’s routine."
        />
      </section>
    </div>
  )
}

function AuthPage() {
  return (
    <div className="auth-grid">
      <div className="panel auth-panel">
        <p className="panel-kicker">Create account</p>
        <h2>Welcome to your wellness space</h2>
        <form className="stacked-form">
          <input placeholder="Full name" />
          <input placeholder="Email address" />
          <input type="password" placeholder="Password" />
          <button type="button" className="primary-btn wide-btn">
            Start your profile
          </button>
        </form>
      </div>

      <div className="panel auth-panel">
        <p className="panel-kicker">Sign in</p>
        <h2>Continue your journey</h2>
        <form className="stacked-form">
          <input placeholder="Email address" />
          <input type="password" placeholder="Password" />
          <button type="button" className="secondary-btn wide-btn">
            Access dashboard
          </button>
        </form>
      </div>
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

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
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
