import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { Activity, BrainCircuit, HeartPulse, MoonStar, Sparkles } from 'lucide-react'

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
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-600 p-2 text-white">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold">VitaTwin AI</div>
                <div className="text-xs text-slate-500">Educational wellness prototype</div>
              </div>
            </div>
            <nav className="hidden gap-3 md:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-full px-3 py-2 text-sm font-medium ${isActive ? 'bg-sky-100 text-sky-800' : 'text-slate-600 hover:bg-slate-100'}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 md:p-8">
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
    <div className="space-y-8">
      <section className="grid gap-8 rounded-3xl bg-gradient-to-br from-sky-900 via-sky-700 to-cyan-600 p-8 text-white shadow-xl md:grid-cols-2 md:p-12">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
            <Sparkles className="h-4 w-4" /> EvoHealthTwin research framework
          </div>
          <h1 className="text-4xl font-bold md:text-6xl">VitaTwin AI</h1>
          <p className="max-w-xl text-sky-100">
            An intelligent digital twin framework for personalized health monitoring and predictive wellness. This project uses synthetic demo data and responsible guidance to support educational wellness insights.
          </p>
          <div className="flex gap-3">
            <a href="/auth" className="rounded-xl bg-white px-4 py-3 font-semibold text-sky-700">Register</a>
            <a href="/auth" className="rounded-xl border border-white/40 px-4 py-3 font-semibold text-white">Sign in</a>
          </div>
          <p className="text-sm text-sky-100">This is a research and educational wellness prototype, not clinical diagnosis.</p>
        </div>
        <div className="grid gap-4">
          <MetricCard icon={<BrainCircuit />} title="Digital Twin" value="Adaptive memory" detail="Long-term and session-aware" />
          <MetricCard icon={<Activity />} title="Dynamic context" value="ACCM" detail="Relevance ranking and structured context" />
          <MetricCard icon={<MoonStar />} title="Responsible AI" value="RPE + RAG" detail="Evidence-first wellness guidance" />
        </div>
      </section>
    </div>
  )
}

function MetricCard({ icon, title, value, detail }: { icon: React.ReactNode; title: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
      <div className="mb-3 inline-flex rounded-lg bg-white/10 p-2">{icon}</div>
      <div className="text-sm text-sky-100">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      <div className="text-sm text-sky-200">{detail}</div>
    </div>
  )
}

function AuthPage() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-2xl font-semibold">Create account</h2>
        <form className="space-y-4">
          <input className="w-full rounded-xl border border-slate-200 p-3" placeholder="Full name" />
          <input className="w-full rounded-xl border border-slate-200 p-3" placeholder="Email" />
          <input type="password" className="w-full rounded-xl border border-slate-200 p-3" placeholder="Password" />
          <button className="w-full rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white">Register</button>
        </form>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-2xl font-semibold">Sign in</h2>
        <form className="space-y-4">
          <input className="w-full rounded-xl border border-slate-200 p-3" placeholder="Email" />
          <input type="password" className="w-full rounded-xl border border-slate-200 p-3" placeholder="Password" />
          <button className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white">Login</button>
        </form>
      </div>
    </div>
  )
}

function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatBox label="Wellness Index" value="78 / 100" sub="Complete" />
        <StatBox label="Sleep" value="7.4h" sub="Average" />
        <StatBox label="Activity" value="8,500" sub="Steps" />
        <StatBox label="Stress" value="32" sub="Low-medium" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Recent trend">Placeholder chart data</Panel>
        <Panel title="Recent recommendations">- Build a flexible evening routine\n- Keep hydration consistent</Panel>
      </div>
    </div>
  )
}

function ChatPage() {
  return (
    <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">AI wellness assistant</h2>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">Demo mode</span>
        </div>
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <div className="rounded-xl bg-white p-3 text-slate-700">I’m scheduling around college and I need a sustainable exercise plan.</div>
          <div className="rounded-xl bg-sky-100 p-3 text-sky-900">A later-in-the-day movement routine may fit your schedule better than a strict morning workout.</div>
        </div>
        <div className="mt-4 flex gap-2">
          <input className="flex-1 rounded-xl border border-slate-200 p-3" placeholder="Ask about sleep, activity, stress, or routines" />
          <button className="rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white">Send</button>
        </div>
      </div>
      <Panel title="Evidence and context">
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li>Retrieved insight: sleep consistency supports better recovery.</li>
          <li>Reasoning: schedule constraint affects exercise timing.</li>
          <li>Safety: general wellness guidance only.</li>
        </ul>
      </Panel>
    </div>
  )
}

function HealthPage() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Add wellness log">
        <form className="space-y-4">
          <input className="w-full rounded-xl border border-slate-200 p-3" placeholder="Sleep hours" />
          <input className="w-full rounded-xl border border-slate-200 p-3" placeholder="Steps" />
          <input className="w-full rounded-xl border border-slate-200 p-3" placeholder="Hydration (L)" />
          <button className="w-full rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white">Save log</button>
        </form>
      </Panel>
      <Panel title="Wellness Index methodology">
        <p className="text-sm text-slate-600">The index is a project-defined wellness indicator. It combines sleep, hydration, activity, stress, and nutrition into a normalized score. Missing data lowers completeness and the result is marked incomplete.</p>
      </Panel>
    </div>
  )
}

function InsightsPage() {
  return (
    <div className="space-y-6">
      <Panel title="Historical wellness trend">Synthetic chart area</Panel>
      <Panel title="What-if simulator">Adjust sleep, steps, hydration, and stress to estimate the model output.</Panel>
    </div>
  )
}

function SettingsPage() {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-4 text-2xl font-semibold">Privacy and settings</h2>
      <ul className="space-y-3 text-slate-600">
        <li>Export your data</li>
        <li>Manage memory visibility</li>
        <li>Delete account and associated records</li>
        <li>Review the educational prototype notice</li>
      </ul>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-4 text-xl font-semibold">{title}</h3>
      <div className="text-slate-600">{children}</div>
    </div>
  )
}

function StatBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      <div className="text-sm text-slate-500">{sub}</div>
    </div>
  )
}

export default App
