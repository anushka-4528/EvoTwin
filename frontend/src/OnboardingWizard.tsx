import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, ChevronLeft, HeartPulse, ShieldCheck, Sparkles } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8002/api'
const AUTH_TOKEN_KEY = 'vitatwin_access_token'

type ProfileUser = {
  full_name: string
  email: string
  age?: number | null
  gender?: string | null
  activity_level?: string | null
  goals: string[]
  dietary_preferences: string[]
  activity_preferences: string[]
  exercise_preferences: string[]
  preferred_activities: string[]
  avoided_activities: string[]
  sleep_hours?: number | null
  sleep_quality?: string | null
  diet_type?: string | null
  health_consent?: string | null
  health_conditions: string[]
  health_conditions_other?: string | null
  health_measurements_consent?: string | null
  blood_pressure_systolic?: number | null
  blood_pressure_diastolic?: number | null
  heart_rate?: number | null
  blood_glucose?: number | null
  allergies: string[]
  allergies_other?: string | null
  medications_status?: string | null
  medications_details?: string | null
  women_health_consent?: string | null
  menstrual_cycle?: string | null
  women_health_conditions: string[]
  women_health_conditions_other?: string | null
  onboarding_completed: boolean
}

type Setup = {
  full_name: string
  age: string
  gender: string
  goals: string[]
  goals_other: string
  activity_level: string
  sleep_hours: string
  sleep_quality: string
  diet_type: string
  dietary_preferences: string[]
  dietary_other: string
  health_consent: string
  health_conditions: string[]
  health_conditions_other: string
  health_measurements_consent: string
  blood_pressure_systolic: string
  blood_pressure_diastolic: string
  heart_rate: string
  blood_glucose: string
  allergies: string[]
  allergies_other: string
  medications_status: string
  medications_details: string
  women_health_consent: string
  menstrual_cycle: string
  women_health_conditions: string[]
  women_health_conditions_other: string
  preferred_activities: string[]
  preferred_activities_other: string
  avoided_activities: string[]
  avoided_activities_other: string
}

type WizardStep = {
  section: number
  title: string
  subtitle?: string
  field: keyof Setup
  kind: 'text' | 'number' | 'single' | 'multi' | 'range' | 'measurements'
  options?: string[]
  optional?: boolean
  otherField?: keyof Setup
  visible?: (form: Setup) => boolean
}

const wizardSteps: WizardStep[] = [
  { section: 1, title: 'What should we call you?', field: 'full_name', kind: 'text' },
  { section: 1, title: 'How old are you?', field: 'age', kind: 'number' },
  { section: 1, title: 'How do you describe your gender?', field: 'gender', kind: 'single', options: ['Female', 'Male', 'Non-binary', 'Prefer not to say'] },
  { section: 2, title: 'What are your main health and wellness goals?', subtitle: 'Choose everything that feels relevant right now.', field: 'goals', kind: 'multi', options: ['Weight management', 'Fitness', 'Nutrition', 'Better sleep', 'Stress management', 'General wellness', 'Healthy lifestyle', 'Other'], otherField: 'goals_other' },
  { section: 3, title: 'How active are your usual days?', field: 'activity_level', kind: 'single', options: ['Mostly sedentary', 'Lightly active', 'Moderately active', 'Very active', 'Highly active'] },
  { section: 3, title: 'How many hours do you usually sleep?', field: 'sleep_hours', kind: 'range' },
  { section: 3, title: 'How would you describe your typical sleep?', field: 'sleep_quality', kind: 'single', options: ['Very good', 'Good', 'Average', 'Poor', 'Very poor'] },
  { section: 4, title: 'What best describes your diet?', field: 'diet_type', kind: 'single', options: ['Vegetarian', 'Non-vegetarian', 'Eggetarian', 'Vegan', 'No specific preference'] },
  { section: 4, title: 'Any dietary preferences or restrictions?', subtitle: 'Select all that apply.', field: 'dietary_preferences', kind: 'multi', options: ['None', 'Lactose-free', 'Gluten-free', 'High-protein', 'Low-carb', 'Other', 'Prefer not to say'], optional: true, otherField: 'dietary_other' },
  { section: 5, title: 'Would you like to tell EvoTwin about your health?', subtitle: 'This helps EvoTwin provide more relevant personalized support.', field: 'health_consent', kind: 'single', options: ['Yes', 'No', 'Prefer not to say'], optional: true },
  { section: 5, title: 'Do you have any existing health conditions?', subtitle: 'Choose any you would like EvoTwin to remember.', field: 'health_conditions', kind: 'multi', options: ['None', 'Diabetes', 'High blood pressure', 'Thyroid condition', 'PCOS', 'Asthma', 'Other', 'Prefer not to say'], optional: true, otherField: 'health_conditions_other', visible: (form) => form.health_consent === 'Yes' },
  { section: 6, title: 'Add any recent health measurements?', subtitle: 'Measurements are optional and saved exactly as entered, without interpretation.', field: 'health_measurements_consent', kind: 'single', options: ['Yes', 'No', 'Prefer not to say'], optional: true },
  { section: 6, title: 'Your recent measurements', subtitle: 'Every field is optional. Leave anything blank that you do not want to add.', field: 'blood_pressure_systolic', kind: 'measurements', optional: true, visible: (form) => form.health_measurements_consent === 'Yes' },
  { section: 7, title: 'Any allergies EvoTwin should remember?', subtitle: 'Choose any that apply.', field: 'allergies', kind: 'multi', options: ['None', 'Food allergy', 'Medication allergy', 'Environmental allergy', 'Other', 'Prefer not to say'], optional: true, otherField: 'allergies_other' },
  { section: 7, title: 'Are there medications you would like us to remember?', field: 'medications_status', kind: 'single', options: ['None', 'Yes', 'Prefer not to say'], optional: true },
  { section: 7, title: 'Which medications should we remember?', subtitle: 'Add only the names you want included in your profile.', field: 'medications_details', kind: 'text', optional: true, visible: (form) => form.medications_status === 'Yes' },
  { section: 8, title: 'Would you like to add women’s health information?', field: 'women_health_consent', kind: 'single', options: ['Yes', 'No', 'Prefer not to say'], optional: true, visible: (form) => form.gender === 'Female' },
  { section: 8, title: 'How would you describe your menstrual cycle?', field: 'menstrual_cycle', kind: 'single', options: ['Regular', 'Usually irregular', 'Very irregular', 'Not applicable', 'Prefer not to say'], optional: true, visible: (form) => form.gender === 'Female' && form.women_health_consent === 'Yes' },
  { section: 8, title: 'Any diagnosed women’s health conditions?', subtitle: 'Choose only what you would like EvoTwin to remember.', field: 'women_health_conditions', kind: 'multi', options: ['None', 'PCOS', 'Endometriosis', 'Thyroid-related condition', 'Other', 'Prefer not to say'], optional: true, otherField: 'women_health_conditions_other', visible: (form) => form.gender === 'Female' && form.women_health_consent === 'Yes' },
  { section: 9, title: 'What activities do you enjoy?', subtitle: 'Pick the kinds of movement you look forward to.', field: 'preferred_activities', kind: 'multi', options: ['Walking', 'Running', 'Cycling', 'Swimming', 'Yoga', 'Strength training', 'Dancing', 'Sports', 'Home workouts', 'Other'], optional: true, otherField: 'preferred_activities_other' },
  { section: 9, title: 'Any activities you prefer to avoid?', subtitle: 'This helps keep suggestions comfortable and realistic.', field: 'avoided_activities', kind: 'multi', options: ['Walking', 'Running', 'Cycling', 'Swimming', 'Yoga', 'Strength training', 'Dancing', 'Sports', 'Home workouts', 'Other'], optional: true, otherField: 'avoided_activities_other' },
]

const buildSteps = [
  'Creating your profile',
  'Organizing your health information',
  'Creating Long-Term Memory',
  'Saving your preferences',
  'Preparing personalized context',
]

async function saveProfile(payload: Record<string, unknown>): Promise<ProfileUser> {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_BASE_URL}/auth/onboarding`, { method: 'POST', headers, body: JSON.stringify(payload) })
  const result = await response.json() as ProfileUser | { detail?: string }
  if (!response.ok) throw new Error('detail' in result && result.detail ? result.detail : 'Unable to save your profile.')
  return result as ProfileUser
}

export function OnboardingWizard({
  currentUser,
  onCompleted,
}: {
  currentUser: ProfileUser
  onCompleted: (user: ProfileUser) => void
}) {
  const [form, setForm] = useState<Setup>({
    full_name: currentUser.full_name ?? '', age: currentUser.age == null ? '' : String(currentUser.age), gender: currentUser.gender ?? '',
    goals: currentUser.goals ?? [], goals_other: '', activity_level: currentUser.activity_level ?? '',
    sleep_hours: currentUser.sleep_hours == null ? '8' : String(currentUser.sleep_hours), sleep_quality: currentUser.sleep_quality ?? '',
    diet_type: currentUser.diet_type ?? '', dietary_preferences: currentUser.dietary_preferences ?? [], dietary_other: '',
    health_consent: currentUser.health_consent ?? '', health_conditions: currentUser.health_conditions ?? [], health_conditions_other: currentUser.health_conditions_other ?? '',
    health_measurements_consent: currentUser.health_measurements_consent ?? '', blood_pressure_systolic: currentUser.blood_pressure_systolic == null ? '' : String(currentUser.blood_pressure_systolic),
    blood_pressure_diastolic: currentUser.blood_pressure_diastolic == null ? '' : String(currentUser.blood_pressure_diastolic), heart_rate: currentUser.heart_rate == null ? '' : String(currentUser.heart_rate),
    blood_glucose: currentUser.blood_glucose == null ? '' : String(currentUser.blood_glucose), allergies: currentUser.allergies ?? [], allergies_other: currentUser.allergies_other ?? '',
    medications_status: currentUser.medications_status ?? '', medications_details: currentUser.medications_details ?? '',
    women_health_consent: currentUser.women_health_consent ?? '', menstrual_cycle: currentUser.menstrual_cycle ?? '',
    women_health_conditions: currentUser.women_health_conditions ?? [], women_health_conditions_other: currentUser.women_health_conditions_other ?? '',
    preferred_activities: currentUser.preferred_activities ?? [], preferred_activities_other: '', avoided_activities: currentUser.avoided_activities ?? [], avoided_activities_other: '',
  })
  const [phase, setPhase] = useState<'welcome' | 'questions' | 'review' | 'creating' | 'ready'>('welcome')
  const [stepIndex, setStepIndex] = useState(0)
  const [direction, setDirection] = useState<'next' | 'back'>('next')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [savedUser, setSavedUser] = useState<ProfileUser | null>(null)
  const navigate = useNavigate()
  const visibleSteps = wizardSteps.filter((item) => !item.visible || item.visible(form))
  const step = visibleSteps[stepIndex]

  const changeField = <K extends keyof Setup>(field: K, value: Setup[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const selectOption = (field: keyof Setup, option: string, multi: boolean) => {
    if (!multi) {
      setForm((current) => ({ ...current, [field]: option } as Setup))
      return
    }
    const current = form[field] as string[]
    const next = option === 'None' || option === 'Prefer not to say'
      ? current.includes(option) ? [] : [option]
      : current.includes('None') || current.includes('Prefer not to say')
        ? [option]
        : current.includes(option) ? current.filter((item) => item !== option) : [...current, option]
    setForm((values) => ({ ...values, [field]: next } as Setup))
  }

  const moveTo = (index: number, nextDirection: 'next' | 'back') => {
    setDirection(nextDirection)
    setStepIndex(index)
    setError('')
  }

  const resolveOther = (items: string[], other: string) => [
    ...items.filter((item) => !['Other', 'None', 'Prefer not to say'].includes(item)),
    ...(items.includes('Other') && other.trim() ? [other.trim()] : []),
  ]

  const continueStep = () => {
    if (!step) return
    if (step.field === 'full_name' && !form.full_name.trim()) return setError('Add your name to continue.')
    if (step.field === 'age' && (!form.age || Number(form.age) < 0 || Number(form.age) > 120)) return setError('Enter an age between 0 and 120.')
    if (step.kind === 'single' && !form[step.field]) return setError('Choose an option to continue.')
    if (step.kind === 'multi' && (form[step.field] as string[]).length === 0 && !step.optional) return setError('Choose at least one option to continue.')
    if (step.otherField && (form[step.field] as string[]).includes('Other') && !(form[step.otherField] as string).trim()) return setError('Add a short note for your “Other” choice.')
    if (step.field === 'medications_details' && !form.medications_details.trim()) return setError('Add a medication name, or skip this optional question.')
    if (stepIndex === visibleSteps.length - 1) setPhase('review')
    else moveTo(stepIndex + 1, 'next')
  }

  const skipStep = () => {
    if (!step) return
    if (step.kind === 'multi') changeField(step.field, [] as never)
    if (stepIndex === visibleSteps.length - 1) setPhase('review')
    else moveTo(stepIndex + 1, 'next')
  }

  const createTwin = async () => {
    setError('')
    setPhase('creating')
    setProgress(0)
    const healthAllowed = form.health_consent === 'Yes'
    const measurementsAllowed = form.health_measurements_consent === 'Yes'
    const womenHealthAllowed = form.gender === 'Female' && form.women_health_consent === 'Yes'
    const conditions = healthAllowed ? form.health_conditions.filter((item) => !['None', 'Other', 'Prefer not to say'].includes(item)) : []
    const allergies = form.allergies.filter((item) => !['None', 'Other', 'Prefer not to say'].includes(item))
    const womenConditions = womenHealthAllowed ? form.women_health_conditions.filter((item) => !['None', 'Other', 'Prefer not to say'].includes(item)) : []
    const asNumber = (value: string) => value.trim() ? Number(value) : null
    const healthHistory = [...conditions, ...(healthAllowed && form.health_conditions.includes('Other') && form.health_conditions_other.trim() ? [form.health_conditions_other.trim()] : [])].join('; ')
    const payload = {
      full_name: form.full_name.trim(), age: Number(form.age), gender: form.gender, goals: resolveOther(form.goals, form.goals_other),
      activity_level: form.activity_level, lifestyle_summary: null,
      dietary_preferences: resolveOther(form.dietary_preferences, form.dietary_other), diet_type: form.diet_type,
      sleep_hours: Number(form.sleep_hours), sleep_quality: form.sleep_quality,
      exercise_preferences: resolveOther(form.preferred_activities, form.preferred_activities_other),
      preferred_activities: resolveOther(form.preferred_activities, form.preferred_activities_other),
      avoided_activities: resolveOther(form.avoided_activities, form.avoided_activities_other),
      health_consent: form.health_consent, health_history: healthHistory || null, health_conditions: conditions,
      health_conditions_other: healthAllowed && form.health_conditions.includes('Other') ? form.health_conditions_other.trim() : null,
      health_measurements_consent: form.health_measurements_consent,
      blood_pressure_systolic: measurementsAllowed ? asNumber(form.blood_pressure_systolic) : null,
      blood_pressure_diastolic: measurementsAllowed ? asNumber(form.blood_pressure_diastolic) : null,
      heart_rate: measurementsAllowed ? asNumber(form.heart_rate) : null,
      blood_glucose: measurementsAllowed ? asNumber(form.blood_glucose) : null,
      allergies, allergies_other: form.allergies.includes('Other') ? form.allergies_other.trim() : null,
      medications_status: form.medications_status, medications_details: form.medications_status === 'Yes' ? form.medications_details.trim() : null,
      women_health_consent: womenHealthAllowed ? 'Yes' : form.gender === 'Female' ? form.women_health_consent : null,
      menstrual_cycle: womenHealthAllowed ? form.menstrual_cycle : null, women_health_conditions: womenConditions,
      women_health_conditions_other: womenHealthAllowed && form.women_health_conditions.includes('Other') ? form.women_health_conditions_other.trim() : null,
    }
    try {
      const saving = saveProfile(payload)
      const animate = (async () => {
        for (let index = 0; index < buildSteps.length; index += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 360))
          setProgress(index + 1)
        }
      })()
      const [user] = await Promise.all([saving, animate])
      setSavedUser(user)
      setPhase('ready')
    } catch (saveError) {
      setPhase('review')
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your profile. Please try again.')
    }
  }

  const goToDashboard = () => {
    if (!savedUser) return
    onCompleted(savedUser)
    navigate('/dashboard', { replace: true })
  }

  const displayList = (items: string[]) => items.filter(Boolean).join(', ') || 'Not shared'
  const measurementList = [
    form.blood_pressure_systolic ? `Systolic ${form.blood_pressure_systolic}` : '',
    form.blood_pressure_diastolic ? `Diastolic ${form.blood_pressure_diastolic}` : '',
    form.heart_rate ? `Heart rate ${form.heart_rate} bpm` : '',
    form.blood_glucose ? `Blood glucose ${form.blood_glucose}` : '',
  ].filter(Boolean)
  const reviewCards = [
    { title: 'Personal', value: `${form.full_name} · ${form.age} · ${form.gender}` },
    { title: 'Goals', value: displayList(resolveOther(form.goals, form.goals_other)) },
    { title: 'Lifestyle', value: `${form.activity_level} · ${form.sleep_hours} hours sleep · ${form.sleep_quality} · ${form.diet_type}` },
    { title: 'Health', value: `Conditions: ${displayList(healthAllowedForReview(form))}\nAllergies: ${displayList(resolveOther(form.allergies, form.allergies_other))}\nMedications: ${form.medications_status === 'Yes' ? form.medications_details : form.medications_status || 'Not shared'}\nMeasurements: ${form.health_measurements_consent === 'Yes' ? displayList(measurementList) : 'Not shared'}` },
    { title: 'Preferences', value: `Diet: ${displayList(resolveOther(form.dietary_preferences, form.dietary_other))}\nEnjoy: ${displayList(resolveOther(form.preferred_activities, form.preferred_activities_other))}\nAvoid: ${displayList(resolveOther(form.avoided_activities, form.avoided_activities_other))}` },
    ...(womenHealthAllowedForReview(form) ? [{ title: 'Women’s health', value: `Cycle: ${form.menstrual_cycle || 'Not shared'}\nConditions: ${displayList(resolveOther(form.women_health_conditions, form.women_health_conditions_other))}` }] : []),
  ]

  if (phase === 'welcome') return <div className="profile-builder profile-welcome"><div className="profile-brand"><span className="profile-brand-mark"><HeartPulse size={20} /></span><span>EvoTwin</span></div><div className="welcome-grid"><section className="welcome-copy"><p className="onboarding-eyebrow"><Sparkles size={15} /> Your wellness, in context</p><h1>Let’s build your EvoTwin</h1><p className="welcome-subtitle">Tell us a little about yourself so EvoTwin can personalize your experience.</p><button type="button" className="wizard-primary" onClick={() => setPhase('questions')}>Let’s get started <ArrowRight size={18} /></button><div className="privacy-note"><ShieldCheck size={18} /><span>This information will be used to create your Long-Term Memory. You can review and update it later.</span></div></section><aside className="welcome-aside"><div className="welcome-pillars"><span><b>01</b> Personal details</span><span><b>02</b> Everyday rhythms</span><span><b>03</b> What matters to you</span></div><p className="welcome-aside-label">A clearer picture, built around you</p><span className="welcome-aside-caption">Private by design · Always yours to update</span></aside></div></div>

  if (phase === 'creating' || phase === 'ready') return <div className="profile-builder build-screen"><div className="profile-brand"><span className="profile-brand-mark"><HeartPulse size={20} /></span><span>EvoTwin</span></div><section className={`build-content ${phase === 'ready' ? 'build-ready' : ''}`} aria-live="polite"><div className="build-emblem">{phase === 'ready' ? <Check size={30} /> : <span className="build-spinner" />}</div><p className="onboarding-eyebrow">Your personal context</p><h1>{phase === 'ready' ? 'Your EvoTwin is ready.' : 'Building your Digital Twin...'}</h1><p className="build-caption">{phase === 'ready' ? 'Your profile and Long-Term Memory are ready to grow with you.' : 'Bringing your profile together, thoughtfully and securely.'}</p><div className="build-checklist">{buildSteps.map((item, index) => <div className={`build-check ${index < progress ? 'build-check-done' : ''}`} key={item}><span>{index < progress ? <Check size={14} /> : <span className="build-dot" />}</span>{item}</div>)}</div>{phase === 'ready' && <button type="button" className="wizard-primary" onClick={goToDashboard}>Go to dashboard <ArrowRight size={18} /></button>}</section></div>

  if (phase === 'review') return <div className="profile-builder review-screen"><div className="wizard-topline"><div className="profile-brand"><span className="profile-brand-mark"><HeartPulse size={20} /></span><span>EvoTwin</span></div><span className="review-step-label">Step 10 of 10</span></div><div className="wizard-progress"><span style={{ width: '100%' }} /></div><section className="review-heading"><p className="onboarding-eyebrow">Your starting point</p><h1>Your EvoTwin Profile</h1><p>Here’s what your Digital Twin will remember. You can update any of it later.</p></section><div className="review-grid">{reviewCards.map((card) => <article className="review-card" key={card.title}><h2>{card.title}</h2><p>{card.value}</p></article>)}</div>{error && <p className="wizard-error" role="alert">{error}</p>}<div className="review-actions"><button type="button" className="wizard-secondary" onClick={() => { setPhase('questions'); moveTo(0, 'back') }}>Edit profile</button><button type="button" className="wizard-primary" onClick={() => void createTwin()}>Create my EvoTwin <ArrowRight size={18} /></button></div><p className="review-privacy"><ShieldCheck size={15} /> Your profile is private and always under your control.</p></div>

  if (!step) return null
  const selected = Array.isArray(form[step.field]) ? form[step.field] as string[] : []
  const selectedSingle = typeof form[step.field] === 'string' ? form[step.field] as string : ''
  const isOtherSelected = selected.includes('Other')
  const sectionLabels = ['', 'The basics', 'Your goals', 'Your rhythm', 'Food that fits', 'Your health', 'Measurements', 'A little more context', 'Your profile', 'Movement']

  return <div className="profile-builder wizard-screen"><div className="wizard-topline"><div className="profile-brand"><span className="profile-brand-mark"><HeartPulse size={20} /></span><span>EvoTwin</span></div><span className="wizard-step-count">Step {step.section} of 10</span></div><div className="wizard-progress" role="progressbar" aria-label="Profile setup progress" aria-valuemin={0} aria-valuemax={10} aria-valuenow={step.section}><span style={{ width: `${step.section * 10}%` }} /></div><div className={`wizard-layout wizard-enter-${direction}`} key={`${step.section}-${stepIndex}`}><section className="wizard-question"><p className="onboarding-eyebrow">{sectionLabels[step.section]}</p><h1>{step.title}</h1>{step.subtitle && <p className="wizard-subtitle">{step.subtitle}</p>}
    {step.kind === 'text' && <label className="wizard-input-label">{step.field === 'full_name' ? 'Your name' : 'Medication names'}<input autoFocus value={form[step.field] as string} onChange={(event) => changeField(step.field, event.target.value as never)} placeholder={step.field === 'full_name' ? 'Name you go by' : 'Add medication names'} /></label>}
    {step.kind === 'number' && <div className="number-selector"><button type="button" aria-label="Decrease age" onClick={() => changeField('age', String(Math.max(0, Number(form.age || 0) - 1)))}>−</button><label><span>Age</span><input autoFocus type="number" min="0" max="120" value={form.age} onChange={(event) => changeField('age', event.target.value)} /><span>years</span></label><button type="button" aria-label="Increase age" onClick={() => changeField('age', String(Math.min(120, Number(form.age || 0) + 1)))}>+</button></div>}
    {step.kind === 'range' && <div className="sleep-range"><div className="sleep-range-value"><strong>{form.sleep_hours}</strong><span>hours a night</span></div><input aria-label="Usual sleep hours" type="range" min="4" max="12" step="0.5" value={form.sleep_hours} onChange={(event) => changeField('sleep_hours', event.target.value)} /><div className="range-limits"><span>4 hours</span><span>12 hours</span></div></div>}
    {(step.kind === 'single' || step.kind === 'multi') && <div className="wizard-options">{step.options?.map((option) => { const active = step.kind === 'single' ? selectedSingle === option : selected.includes(option); return <button type="button" className={`wizard-option ${active ? 'wizard-option-selected' : ''}`} aria-pressed={active} key={option} onClick={() => selectOption(step.field, option, step.kind === 'multi')}><span>{option}</span><span className="wizard-option-check">{active && <Check size={15} />}</span></button> })}</div>}
    {step.kind === 'measurements' && <div className="measurement-grid"><label>Systolic blood pressure <span>mmHg</span><input type="number" min="0" max="300" value={form.blood_pressure_systolic} onChange={(event) => changeField('blood_pressure_systolic', event.target.value)} placeholder="e.g. 118" /></label><label>Diastolic blood pressure <span>mmHg</span><input type="number" min="0" max="200" value={form.blood_pressure_diastolic} onChange={(event) => changeField('blood_pressure_diastolic', event.target.value)} placeholder="e.g. 76" /></label><label>Heart rate <span>bpm</span><input type="number" min="0" max="300" value={form.heart_rate} onChange={(event) => changeField('heart_rate', event.target.value)} placeholder="e.g. 68" /></label><label>Blood glucose <span>optional</span><input type="number" min="0" step="any" value={form.blood_glucose} onChange={(event) => changeField('blood_glucose', event.target.value)} placeholder="Add a value" /></label></div>}
    {isOtherSelected && step.otherField && <label className="wizard-input-label other-input-label">What would you like to add?<input autoFocus value={form[step.otherField] as string} onChange={(event) => changeField(step.otherField!, event.target.value as never)} placeholder="A few words is enough" /></label>}
    {error && <p className="wizard-error" role="alert">{error}</p>}</section><div className="wizard-footer"><button type="button" className="wizard-back" onClick={() => stepIndex === 0 ? setPhase('welcome') : moveTo(stepIndex - 1, 'back')}><ChevronLeft size={17} /> Back</button><div className="wizard-actions">{step.optional && <button type="button" className="wizard-skip" onClick={skipStep}>Skip</button>}<button type="button" className="wizard-primary" onClick={continueStep}>Continue <ArrowRight size={17} /></button></div></div><p className="wizard-privacy"><ShieldCheck size={15} /> Your answers are private. Share only what you’re comfortable with.</p></div></div>
}

function healthAllowedForReview(form: Setup) {
  return form.health_consent === 'Yes' ? resolveOtherItems(form.health_conditions, form.health_conditions_other) : []
}

function womenHealthAllowedForReview(form: Setup) {
  return form.gender === 'Female' && form.women_health_consent === 'Yes'
}

function resolveOtherItems(items: string[], other: string) {
  return [...items.filter((item) => !['Other', 'None', 'Prefer not to say'].includes(item)), ...(items.includes('Other') && other.trim() ? [other.trim()] : [])]
}