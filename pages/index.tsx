import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Head from 'next/head';

type OnboardingFormProps = {
  onStart?: () => void;
};

function OnboardingForm({ onStart }: OnboardingFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [linkedIn, setLinkedIn] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const countries = [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'India', 'China', 'Japan', 'Brazil', 'Mexico', 'South Africa', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Switzerland', 'Austria', 'Belgium', 'Ireland', 'New Zealand', 'Singapore', 'Israel', 'United Arab Emirates', 'Other'
  ];

  useEffect(() => {
    // Use server-side API to avoid client CORS/network issues
    if (typeof window === 'undefined') return;
    let mounted = true;

    // If offline, skip geo lookup
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    function timeoutFetch(url: string, ms = 5000) {
      return new Promise<Response>((resolve, reject) => {
        const controller = new AbortController();
        const id = setTimeout(() => {
          // abort after timeout
          try {
            controller.abort();
          } catch (e) {
            // some environments may throw when aborting without a reason; ignore
          }
        }, ms);

        fetch(url, { signal: controller.signal })
          .then((res) => {
            clearTimeout(id);
            resolve(res);
          })
          .catch((err) => {
            clearTimeout(id);
            reject(err);
          });
      });
    }

    async function fetchGeo() {
      try {
        setLoadingGeo(true);
        const maxRetries = 2;
        let attempt = 0;
        let lastErr: any = null;
        while (attempt <= maxRetries && mounted) {
          try {
            const res = await timeoutFetch('/api/geo', 4000);
            if (!mounted) return;
            if (!res || !res.ok) {
              const txt = res ? await res.text().catch(() => '') : '';
              // eslint-disable-next-line no-console
              console.warn('Geo API returned', res ? res.status : 'no-response', txt);
              lastErr = new Error(`Geo API ${res ? res.status : 'no-response'}`);
              attempt++;
              await new Promise((r) => setTimeout(r, 300 * attempt));
              continue;
            }
            const data = await res.json().catch(() => null);
            if (!mounted) return;
            const countryName = data?.country_name || '';
            if (countryName) {
              const match = countries.find((c) => c.toLowerCase() === countryName.toLowerCase());
              setCountry(match || countryName || '');
            }
            lastErr = null;
            break;
          } catch (err) {
            // network error or aborted — handle carefully to avoid unexpected throws when reading error properties
            const safeMsg = (() => {
              try {
                if (!err) return String(err);
                if (typeof err === 'string') return err;
                if (err instanceof Error) return `${err.name}: ${err.message}`;
                // some environments (AbortError with no reason) may not behave as typical Errors
                if ((err as any).name || (err as any).message) return `${(err as any).name || ''}: ${(err as any).message || ''}`;
                return String(err);
              } catch (e) {
                return 'Unknown error while reading error message';
              }
            })();
            // eslint-disable-next-line no-console
            console.warn('Geo fetch attempt failed', attempt, safeMsg);
            lastErr = err;
            attempt++;
            await new Promise((r) => setTimeout(r, 300 * attempt));
          }
        }

        if (lastErr) {
          // final fallback: don't throw, just log
          // eslint-disable-next-line no-console
          console.warn('All geo fetch attempts failed', lastErr);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('fetchGeo unexpected error', e);
      } finally {
        if (mounted) setLoadingGeo(false);
      }
    }

    // run async
    fetchGeo();
    return () => { mounted = false };
  }, []);

  function validateEmail(email: string) {
    return /\S+@\S+\.\S+/.test(email);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !validateEmail(email)) {
      alert('Please complete the required fields with valid information.');
      return;
    }
    const payload = { firstName, lastName, email, country, linkedIn, password: usePassword ? password : undefined };
    console.log('Onboarding submit', payload);
    setShowModal(true);
  }

  const handleLinkedInConnect = () => {
    alert('LinkedIn sign-up clicked (placeholder)');
  }

  const handleGoogleConnect = () => {
    alert('Google sign-up clicked (placeholder)');
  }

  return (
    <>
    <form className="w-full mt-6 space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="first-name" className="block mb-1 text-sm font-medium text-gray-700">First name</label>
          <input id="first-name" type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 block w-full p-2.5" placeholder="Jane" />
        </div>
        <div>
          <label htmlFor="last-name" className="block mb-1 text-sm font-medium text-gray-700">Last name</label>
          <input id="last-name" type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 block w-full p-2.5" placeholder="Doe" />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block mb-1 text-sm font-medium text-gray-700">Email address</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 block w-full p-2.5" placeholder="you@company.com" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="country" className="block mb-1 text-sm font-medium text-gray-700">Country</label>
          <select id="country" value={country} onChange={(e) => setCountry(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 block w-full p-2.5">
            <option value="">{loadingGeo ? 'Detecting...' : 'Select your country'}</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="linkedin" className="block mb-1 text-sm font-medium text-gray-700">LinkedIn profile <span className="text-gray-400">(optional)</span></label>
          <input id="linkedin" type="url" value={linkedIn} onChange={(e) => setLinkedIn(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 block w-full p-2.5" placeholder="https://www.linkedin.com/in/your-profile" />
        </div>
      </div>

      <div className="mt-3">
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={usePassword}
            onChange={() => setUsePassword(!usePassword)}
            aria-label="Set a password"
          />
          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary">
          </div>
          <span className="ms-3 ml-3 text-sm font-medium text-gray-900">Set a password (optional)</span>
        </label>
      </div>

      {usePassword && (
        <div>
          <label htmlFor="password" className="block mb-1 text-sm font-medium text-gray-700">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-primary block w-full p-2.5" placeholder="Create a password" />
        </div>
      )}

      <div className="flex justify-center mt-4">
        <button type="submit" className="inline-flex items-center px-8 py-3 text-lg font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg">Get Started</button>
      </div>

      <div className="text-center text-sm text-gray-500 mt-3">or use</div>

      <div className="flex justify-center gap-2 mt-3">
        <button type="button" onClick={handleLinkedInConnect} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg">
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.028-3.037-1.849-3.037-1.85 0-2.132 1.445-2.132 2.939v5.667H9.357V9h3.414v1.561h.049c.476-.9 1.637-1.849 3.369-1.849 3.605 0 4.271 2.373 4.271 5.459v6.281zM5.337 7.433c-1.144 0-2.067-.926-2.067-2.067 0-1.143.923-2.067 2.067-2.067 1.143 0 2.067.924 2.067 2.067 0 1.141-.924 2.067-2.067 2.067zM6.953 20.452H3.72V9h3.233v11.452z"/></svg>
          Continue with LinkedIn
        </button>
        <button type="button" onClick={handleGoogleConnect} className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg">
          <svg className="w-5 h-5 mr-2" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
  <path fill="#4285F4" d="M533.5 278.4c0-18.9-1.6-37.6-4.7-55.9H272.1v105.9h147.1c-6.4 34.6-25.4 63.9-54.3 83.4v69.3h87.6c51.2-47.2 81-116.5 81-202.7z"/>
  <path fill="#34A853" d="M272.1 544.3c73.8 0 135.8-24.5 181-66.6l-87.6-69.3c-24.4 16.4-55.5 26-93.4 26-71.7 0-132.6-48.3-154.4-113.2H27.6v71.1C72.2 483.2 165 544.3 272.1 544.3z"/>
  <path fill="#FBBC05" d="M117.7 326.2c-10.7-32.1-10.7-66.8 0-98.9V156.3H27.6c-38.4 76.8-38.4 167.3 0 244.1l90.1-74.2z"/>
  <path fill="#EA4335" d="M272.1 107.7c39.9-.6 78.3 14.4 107.4 41.6l80.6-80.6C406 19.3 344 0 272.1 0 165 0 72.2 61.2 27.6 152.7l90.1 71.1c21.9-64.9 82.8-113.2 154.4-116.1z"/>
</svg>
          Continue with Google
        </button>
      </div>
    </form>

    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
      <div
        onClick={() => setShowModal(false)}
        className={`fixed inset-0 bg-black transition-opacity duration-300 ${showModal ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      <div className={`relative bg-white rounded-lg shadow-lg max-w-md w-full z-10 p-6 text-center transform transition-all duration-300 ${showModal ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-6 scale-95 pointer-events-none'}`}>
        <img src="/icecream.png" alt="ice cream" className="mx-auto mb-4 max-h-40 object-contain" />
        <h2 className="text-2xl font-semibold mb-2">{"Welcome " + firstName + ", Lets build your AI Twin."}</h2>
        <h5 className="text-sm text-gray-500 mb-6">We're excited to get started.</h5>
        <div className="flex justify-center">
          <button onClick={() => { console.log("Let's do it clicked"); if (onStart) onStart(); setShowModal(false); }} className="inline-flex items-center px-6 py-3 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg">Let's do it</button>
        </div>
      </div>
    </div>

    </>
  );
}

function Stepper({ steps, current }: { steps: { id: string; label: string; }[]; current: number }) {
  return (
    <div className="w-full py-4">
      <nav className="stepper-nav flex items-center gap-4">
        {steps.map((s, i) => {
          const active = i === current;
          return (
            <div
              key={s.id}
              className={`stepper-item ${active ? 'active' : ''} inline-flex px-3 rounded-md transition-colors`}
            >
              <span className="icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                  <text x="12" y="16" textAnchor="middle">{i + 1}</text>
                </svg>
              </span>
              <span className="text-sm font-medium">{s.label}</span>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

function StepPanel({ step, stepIndex, total, onNext, onPrev, onProgressChange }: { step: { id: string; label: string }; stepIndex: number; total: number; onNext: () => void; onPrev: () => void; onProgressChange?: (p: number) => void }) {
  // For steps that have internal screens, manage a local sub-step index
  const [subIndex, setSubIndex] = useState(0);
  // State for language selections
  const [onboardingLang, setOnboardingLang] = useState<string | null>(null);
  const [twinLang, setTwinLang] = useState<string | null>(null);

  // Reset sub-step when switching steps
  useEffect(() => {
    setSubIndex(0);
    setOnboardingLang(null);
    setTwinLang(null);
  }, [step.id]);

  // report progress up to parent when subIndex changes
  useEffect(() => {
    if (!onProgressChange) return;
    if (step.id === 'language') {
      const totalQuestions = 2; // only questions count for progress bar
      const answered = Math.max(0, Math.min(totalQuestions, subIndex)); // subIndex 0->0,1->1,2->2
      onProgressChange(answered / totalQuestions);
    } else {
      // default: completed when shown
      onProgressChange(stepIndex < total - 1 ? 1 : 0);
    }
  }, [subIndex, onProgressChange, step.id, stepIndex, total]);

  const goPrev = () => {
    if (subIndex === 0) {
      onPrev();
    } else {
      setSubIndex((s) => Math.max(0, s - 1));
    }
  };

  const goNext = () => {
    // For language step, ensure choices are made before proceeding to feedback/next
    if (step.id === 'language') {
      const lastSub = 2; // Q1, Q2, Feedback
      if (subIndex < lastSub) {
        // Validation: require selection for Q1/Q2
        if (subIndex === 0 && !onboardingLang) return alert('Please select a language to continue');
        if (subIndex === 1 && !twinLang) return alert('Please select a language for your AI Twin');
        setSubIndex((s) => s + 1);
        return;
      }
      // If on feedback and user presses Continue, move to the next main step
      onNext();
      return;
    }

    // Default behavior for simple steps
    onNext();
  };

  // UI helpers
  const ButtonChoice = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
    <button type="button" onClick={onClick} className={`px-4 py-2 rounded-md border ${selected ? 'bg-primary text-white border-transparent' : 'bg-white text-gray-700 border-gray-300'}`}>
      {label}
    </button>
  );

  // Render language step with an intro screen
  const [showIntro, setShowIntro] = useState(true);

  // Reset intro when step changes
  useEffect(() => {
    setShowIntro(true);
    setSubIndex(0);
    setOnboardingLang(null);
    setTwinLang(null);
  }, [step.id]);

  // Report 0 progress while on intro
  useEffect(() => {
    if (!onProgressChange) return;
    if (showIntro) {
      onProgressChange(0);
    }
  }, [showIntro, onProgressChange]);

  if (step.id === 'language') {
    return (
      <div className="mt-6 w-full">
        {/* Intro screen for the step */}
        {showIntro ? (
          <div className="border border-dashed border-gray-200 rounded-md p-8 min-h-[180px] flex flex-col items-center justify-center">
            <h3 className="text-2xl font-semibold">{step.label}</h3>
            <p className="text-sm text-gray-500 mt-2">“Let’s set your language preferences”</p>
            <p className="text-sm text-gray-400 mt-1">“This makes sure the Twin speaks in the right voice for you and your clients.”</p>
            <div className="mt-6">
              <button type="button" onClick={() => setShowIntro(false)} className="px-6 py-3 bg-primary text-white rounded-md">Start Step {stepIndex + 1}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="border border-dashed border-gray-200 rounded-md p-6 min-h-[220px]">
              {subIndex === 0 && (
                <div className="space-y-4 text-center">
                  <h4 className="text-lg font-medium">Q1. Which language would you like to complete onboarding in?</h4>
                  <div className="flex justify-center gap-4 mt-4">
                    <ButtonChoice label="English" selected={onboardingLang === 'English'} onClick={() => setOnboardingLang('English')} />
                    <ButtonChoice label="Dutch" selected={onboardingLang === 'Dutch'} onClick={() => setOnboardingLang('Dutch')} />
                  </div>
                </div>
              )}

              {subIndex === 1 && (
                <div className="space-y-4 text-center">
                  <h4 className="text-lg font-medium">Q2. Which language should your AI Twin use with clients?</h4>
                  <div className="flex justify-center gap-4 mt-4">
                    <ButtonChoice label="English" selected={twinLang === 'English'} onClick={() => setTwinLang('English')} />
                    <ButtonChoice label="Dutch" selected={twinLang === 'Dutch'} onClick={() => setTwinLang('Dutch')} />
                  </div>
                </div>
              )}

              {subIndex === 2 && (
                <div className="text-center">
                  <div className="flex items-center justify-center">
                    {/* simple AI speaking SVG icon */}
                    <svg width="96" height="96" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className="mx-auto">
                      <rect x="3" y="3" width="18" height="14" rx="2" stroke="#6F3E87" strokeWidth="1.5" fill="#F8F5FB" />
                      <path d="M7 8h10M7 11h6" stroke="#6F3E87" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="18" cy="18" r="3" stroke="#6F3E87" strokeWidth="1.2" fill="#fff" />
                      <path d="M16 18c0-.667.5-1 2-1" stroke="#6F3E87" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>

                  <h2 className="text-2xl font-semibold mt-4">Your Twin will speak in your chosen language.</h2>

                  <div className="mt-6 flex items-center justify-center gap-4">
                    <button type="button" onClick={() => { setShowIntro(true); }} className="px-4 py-2 rounded-md border bg-white text-gray-700 border-gray-300">Revisit questions</button>
                    <button type="button" onClick={goNext} className="px-4 py-2 rounded-md bg-primary text-white">Proceed to Step {stepIndex + 2}</button>
                  </div>
                </div>
              )}
            </div>

            {/* Sub-step navigation for questions: Previous/Next */}
            {(subIndex === 0 || subIndex === 1) && (
              <div className="flex justify-between mt-4">
                <button type="button" onClick={() => setSubIndex((s) => Math.max(0, s - 1))} disabled={subIndex === 0} className={`px-4 py-2 rounded-md ${subIndex === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white border border-gray-300 text-gray-700'}`}>
                  Previous
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">{subIndex + 1} / 3</span>
                  <button type="button" onClick={() => {
                    // validate selection before advancing
                    if (subIndex === 0 && !onboardingLang) return;
                    if (subIndex === 1 && !twinLang) return;
                    setSubIndex((s) => Math.min(2, s + 1));
                  }} disabled={(subIndex === 0 && !onboardingLang) || (subIndex === 1 && !twinLang)} className={`px-4 py-2 rounded-md ${((subIndex === 0 && !onboardingLang) || (subIndex === 1 && !twinLang)) ? 'bg-gray-100 text-gray-400' : 'bg-primary text-white'}`}>
                    {subIndex === 1 ? 'Review' : 'Next'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Fallback generic panel (no bottom navigation)
  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold mb-2">Step {stepIndex + 1}: {step.label}</h3>
      <div className="border border-dashed border-gray-200 rounded-md p-6 min-h-[200px] flex items-center justify-center text-gray-400">
        <span>This step is currently blank. You will provide the form content later.</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [showStepper, setShowStepper] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepProgress, setStepProgress] = useState<Record<string, number>>({});

  const steps = useMemo(() => [
    { id: 'language', label: 'Language' },
    { id: 'identity', label: 'Identity & Tone' },
    { id: 'method', label: 'Method & Beliefs' },
    { id: 'example', label: 'Example in Action' },
    { id: 'guardrails', label: 'Guardrails' },
    { id: 'preview', label: 'Preview' }
  ], []);

  function handleStart() {
    setShowStepper(true);
    setCurrentStep(0);
    // scroll to jumbotron area if needed
    const el = document.querySelector('.jumbotron');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  const handleStepProgress = useCallback((id: string, p: number) => {
    setStepProgress((prev) => ({ ...prev, [id]: Math.max(0, Math.min(1, p)) }));
  }, [setStepProgress]);

  const reportProgress = useCallback((p: number) => {
    const id = steps[currentStep]?.id;
    if (!id) return;
    handleStepProgress(id, p);
  }, [handleStepProgress, currentStep]);

  return (
    <>
      <Head>
        <title>CoachNova - Account Setup</title>
        <meta name="description" content="Set up your CoachNova account" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="onboarding-container">
        <div className="container">
          <div className="logo-container">
            <img
              src="/logo.svg"
              alt="CoachNova"
              className="logo"
            />
          </div>

          {showStepper && <Stepper steps={steps} current={currentStep} />}

          <div className="jumbotron">
            <div className="title-section">
            {!showStepper && (
              <>
                <h1 className="w-full text-center text-[#111928] font-inter font-extrabold text-4xl leading-tight tracking-tight relative">Let's set up your account</h1>
                <p className="supporting-text">
                  This info stays private and is used only for your profile.
                </p>
              </>
            )}

            {/* When the stepper is active, show a thin segmented progress bar at the top of the jumbotron */}
            {showStepper && (
              <div className="w-full mb-4">
                <div className="progress-steps">
                  {steps[currentStep].id === 'language' ? (
                    // For step 1, show 2 segments (two questions)
                    [0,1].map((i) => {
                      const pct = (stepProgress['language'] || 0) >= ((i + 1) / 2) ? 100 : (stepProgress['language'] || 0) * 100;
                      return (
                        <div key={i} className={`progress-segment ${pct > 0 ? 'active' : ''}`}>
                          <div className="progress-inner" style={{ width: `${pct}%` }} />
                        </div>
                      );
                    })
                  ) : (
                    // For other steps, single segment representing whole step progress
                    <div className={`progress-segment ${(stepProgress[steps[currentStep].id] || 0) >= 1 ? 'active' : ''}`}>
                      <div className="progress-inner" style={{ width: `${(stepProgress[steps[currentStep].id] || 0) * 100}%` }} />
                    </div>
                  )}
                </div>
              </div>
            )}

              {/* Onboarding form (Flowbite) or stepper content */}
              {!showStepper ? (
                <OnboardingForm onStart={handleStart} />
              ) : (
                <div className="w-full">
                  <StepPanel
                    step={steps[currentStep]}
                    stepIndex={currentStep}
                    total={steps.length}
                    onPrev={() => setCurrentStep((s) => Math.max(0, s - 1))}
                    onNext={() => setCurrentStep((s) => Math.min(steps.length - 1, s + 1))}
                    onProgressChange={reportProgress}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="decorative-graphic">
          <svg 
            width="616" 
            height="1005" 
            viewBox="0 0 616 1005" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M1 1004C131 957 46.816 832.901 170.593 831.5C202.643 832.901 248.407 841.809 280.793 855.379C313.18 868.949 352.684 873.313 381.804 853.675C404.74 838.205 416.675 811.185 426.06 785.152C439.492 747.927 450.244 708.607 446.62 669.189C442.996 629.771 422.588 590.005 387.218 572.267C358.282 557.763 324.214 559.63 291.925 561.834C283.419 562.42 274.555 563.104 267.264 567.523C259.973 571.941 254.939 581.331 258.28 589.169C261.655 597.073 271.343 599.808 279.86 600.981C323.509 606.962 367.884 596.975 409.471 582.417C444.092 570.302 479.115 553.801 500.955 524.316C534.22 479.394 519.389 417.96 463.144 403.891C411.033 390.853 342.539 398.81 295.679 424.843C257.456 446.066 205.659 484.171 194.777 529.223C188.582 554.886 201.558 580.702 209.554 605.866C221.522 643.482 222.487 684.517 212.31 722.665C211.507 725.694 210.618 728.853 211.29 731.925C212.701 738.33 220.263 741.424 226.827 741.283C233.391 741.142 239.803 738.873 246.346 739.166C266.797 740.1 277.484 763.82 281.119 783.99C284.754 804.161 287.987 827.838 305.835 837.89C318.388 844.957 333.968 842.45 348.029 839.291C367.135 834.992 386.046 829.857 404.708 823.908C443.767 811.445 484.605 792.849 503.961 756.699C522.568 721.959 518.217 676.158 544.419 646.728C548.271 642.396 552.719 638.532 555.909 633.69C563.167 622.671 565.066 605.822 577.728 602.121C589.467 598.69 600.935 611.837 599.948 624.039C598.961 636.23 589.652 646.131 579.659 653.187C571.826 658.713 562.864 663.598 558.394 672.076C553.924 680.555 557.3..."
              stroke="white" 
              strokeWidth="1.2" 
              strokeMiterlimit="10"
            />
          </svg>
        </div>
      </main>
    </>
  );
}
