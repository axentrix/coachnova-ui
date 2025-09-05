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

    // Skip automatic geo detection in preview/hosted iframe environments to avoid proxy/CORS failures
    if (typeof window !== 'undefined' && window.location && window.location.port && window.location.port !== '3000') {
      // eslint-disable-next-line no-console
      console.debug('Skipping auto geo detect in non-dev-server environment', window.location.origin);
      return;
    }

    function timeoutFetch(url: string, ms = 5000): Promise<Response | null> {
      // Simpler, AbortController-free timeout using Promise.race to avoid AbortError being thrown
      return new Promise((resolve) => {
        const fetchPromise = fetch(url).then((r) => r).catch((err) => {
          // eslint-disable-next-line no-console
          console.debug('fetch error', err?.name || err?.message || String(err));
          return null;
        });
        const timeout = new Promise<null>((res) => setTimeout(() => res(null), ms));
        Promise.race([fetchPromise, timeout]).then((v) => resolve(v as Response | null));
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
            // Try relative path only (should work when running dev server directly)
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

  // Manual detect button handler so users in preview can trigger lookup
  async function detectCountry() {
    try {
      setLoadingGeo(true);
      const timeoutMs = 5000;
      const fetchPromise = fetch('/api/geo').then((r) => r).catch(() => null);
      const timeout = new Promise<null>((res) => setTimeout(() => res(null), timeoutMs));
      const res = await Promise.race([fetchPromise, timeout]) as Response | null;
      if (!res || !res.ok) return alert('Country detection failed');
      const data = await res.json().catch(() => null);
      const countryName = data?.country_name || '';
      if (countryName) {
        const match = countries.find((c) => c.toLowerCase() === countryName.toLowerCase());
        setCountry(match || countryName || '');
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('detectCountry failed', e);
      alert('Country detection failed');
    } finally {
      setLoadingGeo(false);
    }
  }

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
          <div className="flex gap-2">
            <select id="country" value={country} onChange={(e) => setCountry(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 block w-full p-2.5">
              <option value="">{loadingGeo ? 'Detecting...' : 'Select your country'}</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button type="button" onClick={detectCountry} className="px-3 py-2 rounded-md bg-white border border-gray-300 text-gray-700">Detect</button>
          </div>
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
        <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/icecream.png`} alt="ice cream" className="mx-auto mb-4 max-h-40 object-contain" />
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

function Stepper({ steps, current, stepProgress, onJump }: { steps: { id: string; label: string; }[]; current: number; stepProgress?: Record<string, number>; onJump?: (index: number) => void }) {
  return (
    <div className="w-full py-4">
      <nav className="stepper-nav flex items-center gap-4">
        {steps.map((s, i) => {
          const active = i === current;
          const completed = (stepProgress && (stepProgress[s.id] || 0) >= 1) || i < current;
          const clickable = completed && typeof onJump === 'function';
          return (
            <div
              key={s.id}
              onClick={clickable ? () => onJump!(i) : undefined}
              onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onJump!(i); } : undefined}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              className={`stepper-item ${active ? 'active' : ''} ${completed ? 'completed' : ''} inline-flex px-3 rounded-md transition-colors ${clickable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
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
  const [subIndex, setSubIndex] = useState(0);
  const [onboardingLang, setOnboardingLang] = useState<string | null>(null);
  const [twinLang, setTwinLang] = useState<string | null>(null);

  // Identity & Tone state
  const [q1Text, setQ1Text] = useState('');
  const toneOptions = ['Direct','Warm','Curious','Challenging','Calm','Energetic'];
  const [q2Selections, setQ2Selections] = useState<string[]>([]);
  const [q2OtherOpen, setQ2OtherOpen] = useState(false);
  const [q2OtherText, setQ2OtherText] = useState('');

  const q3Options = ['What if…','Tell me more','How do you know?','What’s the cost of not changing?','What’s true for you right now?','Say more about that'];
  const [q3Selection, setQ3Selection] = useState<string | null>(null);
  const [q3OtherOpen, setQ3OtherOpen] = useState(false);
  const [q3OtherText, setQ3OtherText] = useState('');

  const q4Options = ['You must…','Everything happens for a reason','Just be positive','It’s not that bad','Follow my advice','Calm down'];
  const [q4Selection, setQ4Selection] = useState<string | null>(null);
  const [q4OtherOpen, setQ4OtherOpen] = useState(false);
  const [q4OtherText, setQ4OtherText] = useState('');

  const q5Options = ['Founders','Senior managers','Teams','High potentials','Entrepreneurs','Corporate leaders'];
  const [q5Selections, setQ5Selections] = useState<string[]>([]);
  const [q5OtherOpen, setQ5OtherOpen] = useState(false);
  const [q5OtherText, setQ5OtherText] = useState('');

  // Method & Beliefs (step 3)
  const methodQ1Options = ['ICF / Co-Active','Solution-focused','Cognitive-behavioral (CBT)','Somatic / body-based','Narrative','Systemic','My own mix'];
  const [mQ1Selection, setMQ1Selection] = useState<string | null>(null);
  const [mQ1OtherOpen, setMQ1OtherOpen] = useState(false);
  const [mQ1OtherText, setMQ1OtherText] = useState('');

  const methodQ2Options = ['…people take responsibility','…they get out of their comfort zone','���they connect to their values','…they stop trying to fix themselves','…they feel safe to be vulnerable','…they commit to action'];
  const [mQ2Selection, setMQ2Selection] = useState<string | null>(null);
  const [mQ2OtherOpen, setMQ2OtherOpen] = useState(false);
  const [mQ2OtherText, setMQ2OtherText] = useState('');

  const methodQ3Options = ['Life is a journey','Climbing a mountain','Crossing a river','Riding a bike','Navigating a storm','Planting seeds'];
  const [mQ3Selection, setMQ3Selection] = useState<string | null>(null);
  const [mQ3OtherOpen, setMQ3OtherOpen] = useState(false);
  const [mQ3OtherText, setMQ3OtherText] = useState('');

  // Example in Action (step 4)
  const exampleQ1Options = [
    'Client avoided a hard conversation',
    'Client lacked confidence',
    'Client procrastinated',
    'Client overwhelmed by change',
    'Client conflicted about values',
    'Client reached success but felt empty'
  ];
  const [exQ1Selection, setExQ1Selection] = useState<string | null>(null);
  const [exQ1OtherOpen, setExQ1OtherOpen] = useState(false);
  const [exQ1OtherText, setExQ1OtherText] = useState('');

  const exampleQ2Options = [
    'Asked a deeper question',
    'Named the resistance',
    'Reframed perspective',
    'Reflected client\'s words',
    'Brought in a metaphor',
    'Created a pause/silence'
  ];
  const [exQ2Selection, setExQ2Selection] = useState<string | null>(null);
  const [exQ2OtherOpen, setExQ2OtherOpen] = useState(false);
  const [exQ2OtherText, setExQ2OtherText] = useState('');

  const [exQ3Text, setExQ3Text] = useState('');

  // Guardrails (step 5)
  const guardQ1Options = [
    'Give direct advice',
    'Act like therapy',
    'Handle crises alone',
    'Pretend to be you',
    'Share personal details',
    'Work with clients in crisis'
  ];
  const [gQ1Selections, setGQ1Selections] = useState<string[]>([]);
  const [gQ1OtherOpen, setGQ1OtherOpen] = useState(false);
  const [gQ1OtherText, setGQ1OtherText] = useState('');

  const guardQ2Options = [
    'Always labeled “AI Assistant”',
    'Different interface/platform',
    'AI introduces itself',
    'Clients opt-in to AI'
  ];
  const [gQ2Selection, setGQ2Selection] = useState<string | null>(null);
  const [gQ2OtherOpen, setGQ2OtherOpen] = useState(false);
  const [gQ2OtherText, setGQ2OtherText] = useState('');

  const guardQ3Rows = [
    'Check ins',
    'Homework',
    'Goal reminders',
    'Reflection prompts',
    'Celebrate progress',
    'Suggest resources',
    'Handle emotions',
    'Scheduling'
  ];
  // map of row -> 'never'|'review'|'independent' | null
  const [gQ3Map, setGQ3Map] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    guardQ3Rows.forEach(r => { initial[r] = null; });
    return initial;
  });

  // Reset when step changes
  const [previewRating, setPreviewRating] = useState<number>(5);
  const [showAdvancedPreviewControls, setShowAdvancedPreviewControls] = useState(false);
  const [directness, setDirectness] = useState<number>(5);
  const [warmth, setWarmth] = useState<number>(5);
  const [challenge, setChallenge] = useState<number>(5);

  // committed values applied on release
  const [commDirectness, setCommDirectness] = useState<number>(5);
  const [commWarmth, setCommWarmth] = useState<number>(5);
  const [commChallenge, setCommChallenge] = useState<number>(5);
  const [previewMessage, setPreviewMessage] = useState<{msg: string; reflection: string} | null>(null);
  const [feedbackThumb, setFeedbackThumb] = useState<'up'|'down'|null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(8);
  const [selectedFeedbackChoice, setSelectedFeedbackChoice] = useState<'accept'|'tweak'|'sharpen'|null>(null);

  // demo content and fade state for preview card
  const [demoContent, setDemoContent] = useState<string>('Hi, I’m here to help you reflect. What if we explore what’s holding you back right now?');
  const [demoVisible, setDemoVisible] = useState(true);

  const computePreviewGradient = (d: number, w: number, c: number) => {
    // Colors for directness, warmth, challenge
    const c1 = 'rgb(214, 107, 250)';
    const c2 = 'rgb(255, 210, 122)';
    const c3 = 'rgb(105, 237, 199)';

    // Normalize weights
    const total = Math.max(0.0001, d + w + c);
    let p1 = (d / total) * 100; // percent for first color
    let p2 = (w / total) * 100; // percent for second color
    let p3 = (c / total) * 100; // percent for third color

    // Ensure minimum visible segment to avoid tiny slivers, then re-normalize
    const minSeg = 8; // percent minimum per segment
    const parts = [p1, p2, p3];
    let remaining = 100;
    const adjusted: number[] = [0,0,0];

    // First pass: clamp small segments to minSeg
    let flexibleTotal = 0;
    for (let i = 0; i < 3; i++) {
      if (parts[i] < minSeg) {
        adjusted[i] = minSeg;
        remaining -= minSeg;
      } else {
        flexibleTotal += parts[i];
      }
    }

    // Distribute remaining proportionally among flexible parts
    if (flexibleTotal <= 0) {
      // evenly distribute if all were too small
      adjusted[0] = adjusted[1] = adjusted[2] = 100 / 3;
    } else {
      for (let i = 0; i < 3; i++) {
        if (adjusted[i] === 0) {
          adjusted[i] = (parts[i] / flexibleTotal) * remaining;
        }
      }
    }

    // cumulative stops
    const stop1 = Math.round(adjusted[0]);
    const stop2 = Math.round(adjusted[0] + adjusted[1]);

    // Build smoother gradient with a tiny overlap for blending
    const overlap = 2; // % overlap between segments for softer transitions
    const s1a = Math.max(0, stop1 - overlap);
    const s1b = Math.min(100, stop1 + overlap);
    const s2a = Math.max(0, stop2 - overlap);
    const s2b = Math.min(100, stop2 + overlap);

    return `linear-gradient(90deg, ${c1} 0%, ${c1} ${s1a}%, ${c2} ${s1b}%, ${c2} ${s2a}%, ${c3} ${s2b}%, ${c3} 100%)`;
  };

  // background crossfade states
  const [bgGradient, setBgGradient] = useState<string>(() => computePreviewGradient(commDirectness, commWarmth, commChallenge));
  const [nextBgGradient, setNextBgGradient] = useState<string>('');
  const [bgFading, setBgFading] = useState(false);

  const commitPreviewFromSliders = (which: 'directness' | 'warmth' | 'challenge') => {
    setCommDirectness(directness);
    setCommWarmth(warmth);
    setCommChallenge(challenge);
    // determine message based on new committed values
    const d = directness; const wv = warmth; const ch = challenge;
    let msg = '“Let’s get to the real issue. What’s the cost of not changing this?”';
    let reflection = '“Real change happens when we stop avoiding discomfort. Imagine climbing a mountain — the only way is up. What tough step are you avoiding?”';
    if (wv >= 7 && wv > d) {
      msg = '“I’m glad you’re here. Tell me more about what feels heavy for you right now.”';
      reflection = '“Real change happens when we feel safe to be vulnerable. Think of planting seeds — growth takes time and care. What seed do you want to nurture this week?”';
    } else if (d >= 7 && d >= wv) {
      msg = '“What’s holding you back? Be specific.”';
      reflection = '“Real change happens when excuses stop. Picture riding a bike — either you push the pedal, or you don’t move. What’s the first action you’ll take today?”';
    }
    // small tweak: if challenge high, add slightly more confrontational tone
    if (ch >= 8) {
      msg = msg.replace(/\?"$/, ' — and what will you do about it?"');
    }
    setPreviewMessage({ msg, reflection });

    // generate demo content based on sliders (short variation)
    const gen = () => {
      if (wv >= 7 && wv > d) return `I\'m glad you\'re here. Tell me more about what feels heavy for you right now.`;
      if (d >= 7 && d >= wv) return `What\'s holding you back? Be specific.`;
      if (ch >= 7) return `Tell me about the feeling behind that choice.`;
      return `Hi, I\'m here to help you reflect. What if we explore what\'s holding you back right now?`;
    };

    // fade demo text
    setDemoVisible(false);

    // background crossfade: set next gradient and fade
    const newBg = computePreviewGradient(d, wv, ch);
    setNextBgGradient(newBg);
    setBgFading(true);

    setTimeout(() => {
      setDemoContent(gen());
      setDemoVisible(true);
    }, 220);

    // after a short delay, swap background and clear fading
    setTimeout(() => {
      setBgGradient(newBg);
      setNextBgGradient('');
      setBgFading(false);
    }, 360);
  };

  useEffect(() => {
    setSubIndex(0);
    setOnboardingLang(null);
    setTwinLang(null);
    // identity reset
    setQ1Text('');
    setQ2Selections([]);
    setQ2OtherOpen(false);
    setQ2OtherText('');
    setQ3Selection(null);
    setQ3OtherText('');
    setQ4Selection(null);
    setQ4OtherOpen(false);
    setQ4OtherText('');
    setQ5Selections([]);
    setQ5OtherOpen(false);
    setQ5OtherText('');
    // method reset
    setMQ1Selection(null);
    setMQ1OtherOpen(false);
    setMQ1OtherText('');
    setMQ2Selection(null);
    setMQ2OtherOpen(false);
    setMQ2OtherText('');
    setMQ3Selection(null);
    setMQ3OtherOpen(false);
    setMQ3OtherText('');
    // example reset
    setExQ1Selection(null);
    setExQ1OtherOpen(false);
    setExQ1OtherText('');
    setExQ2Selection(null);
    setExQ2OtherOpen(false);
    setExQ2OtherText('');
    setExQ3Text('');
    // guardrails reset
    setGQ1Selections([]);
    setGQ1OtherOpen(false);
    setGQ1OtherText('');
    setGQ2Selection(null);
    setGQ2OtherOpen(false);
    setGQ2OtherText('');
    setGQ3Map(() => {
      const initial: Record<string, string | null> = {};
      guardQ3Rows.forEach(r => { initial[r] = null; });
      return initial;
    });

    // preview reset
    setPreviewRating(5);
    setShowAdvancedPreviewControls(false);
    setDirectness(5);
    setWarmth(5);
    setChallenge(5);
  }, [step.id]);

  // report progress
  useEffect(() => {
    if (!onProgressChange) return;
    if (step.id === 'language') {
      const totalQuestions = 2;
      const answered = Math.max(0, Math.min(totalQuestions, subIndex));
      onProgressChange(answered / totalQuestions);
      return;
    }
    if (step.id === 'identity') {
      const answered = [
        q1Text.trim() !== '' ? 1 : 0,
        (q2Selections.length > 0 || (q2OtherOpen && q2OtherText.trim() !== '')) ? 1 : 0,
        (q3Selection !== null || q3OtherText.trim() !== '') ? 1 : 0,
        (q4Selection !== null || (q4OtherOpen && q4OtherText.trim() !== '')) ? 1 : 0,
        (q5Selections.length > 0 || (q5OtherOpen && q5OtherText.trim() !== '')) ? 1 : 0,
      ].reduce((a,b) => a+b, 0);
      onProgressChange(answered / 5);
      return;
    }
    if (step.id === 'method') {
      const answered = [
        (mQ1Selection !== null || (mQ1OtherOpen && mQ1OtherText.trim() !== '')) ? 1 : 0,
        (mQ2Selection !== null || (mQ2OtherOpen && mQ2OtherText.trim() !== '')) ? 1 : 0,
        (mQ3Selection !== null || (mQ3OtherOpen && mQ3OtherText.trim() !== '')) ? 1 : 0,
      ].reduce((a,b) => a+b, 0);
      onProgressChange(answered / 3);
      return;
    }
    if (step.id === 'example') {
      const answered = [
        (exQ1Selection !== null || (exQ1OtherOpen && exQ1OtherText.trim() !== '')) ? 1 : 0,
        (exQ2Selection !== null || (exQ2OtherOpen && exQ2OtherText.trim() !== '')) ? 1 : 0,
        exQ3Text.trim() !== '' ? 1 : 0,
      ].reduce((a,b) => a+b, 0);
      onProgressChange(answered / 3);
      return;
    }
    if (step.id === 'guardrails') {
      const q1Answered = (gQ1Selections.length > 0 || (gQ1OtherOpen && gQ1OtherText.trim() !== '')) ? 1 : 0;
      const q2Answered = (gQ2Selection !== null || (gQ2OtherOpen && gQ2OtherText.trim() !== '')) ? 1 : 0;
      const totalRows = guardQ3Rows.length;
      const answeredRows = guardQ3Rows.reduce((acc, r) => acc + (gQ3Map[r] ? 1 : 0), 0);
      const q3Score = totalRows > 0 ? (answeredRows / totalRows) : 0;
      const answered = q1Answered + q2Answered + q3Score;
      onProgressChange(answered / 3);
      return;
    }

    if (step.id === 'preview') {
      const answered = previewRating > 0 ? 1 : 0;
      onProgressChange(answered);
      return;
    }

    onProgressChange(stepIndex < total - 1 ? 1 : 0);
  }, [onProgressChange, step.id, subIndex, stepIndex, total, q1Text, q2Selections, q2OtherOpen, q2OtherText, q3Selection, q3OtherText, q4Selection, q4OtherOpen, q4OtherText, q5Selections, q5OtherOpen, q5OtherText, mQ1Selection, mQ1OtherOpen, mQ1OtherText, mQ2Selection, mQ2OtherOpen, mQ2OtherText, mQ3Selection, mQ3OtherOpen, mQ3OtherText, exQ1Selection, exQ1OtherOpen, exQ1OtherText, exQ2Selection, exQ2OtherOpen, exQ2OtherText, exQ3Text, gQ1Selections, gQ1OtherOpen, gQ1OtherText, gQ2Selection, gQ2OtherOpen, gQ2OtherText, gQ3Map, previewRating, showAdvancedPreviewControls, directness, warmth, challenge]);

  const goPrev = () => {
    if (subIndex === 0) return onPrev();
    setSubIndex((s) => Math.max(0, s - 1));
  };

  const goNext = () => {
    if (step.id === 'language') {
      const lastSub = 2;
      if (subIndex < lastSub) {
        if (subIndex === 0 && !onboardingLang) return alert('Please select a language to continue');
        if (subIndex === 1 && !twinLang) return alert('Please select a language for your AI Twin');
        setSubIndex((s) => s + 1);
        return;
      }
      onNext();
      return;
    }

    if (step.id === 'identity') {
      const lastSub = 5; // 0..4 questions, 5 feedback
      if (subIndex < lastSub) {
        // validations
        if (subIndex === 0 && q1Text.trim() === '') return alert('Please answer Q1 to continue');
        if (subIndex === 1 && q2Selections.length === 0 && !(q2OtherOpen && q2OtherText.trim() !== '')) return alert('Please select at least one tone for Q2');
        if (subIndex === 2 && q3Selection === null && q3OtherText.trim() === '') return alert('Please select or enter a phrase for Q3');
        if (subIndex === 3 && q4Selection === null && !(q4OtherOpen && q4OtherText.trim() !== '')) return alert('Please select a phrase for Q4');
        setSubIndex((s) => s + 1);
        return;
      }
      onNext();
      return;
    }

    if (step.id === 'example') {
      const lastSub = 3; // 0..2 questions, 3 feedback
      if (subIndex < lastSub) {
        if (subIndex === 0 && exQ1Selection === null && !(exQ1OtherOpen && exQ1OtherText.trim() !== '')) return alert('Please answer Q1 to continue');
        if (subIndex === 1 && exQ2Selection === null && !(exQ2OtherOpen && exQ2OtherText.trim() !== '')) return alert('Please answer Q2 to continue');
        if (subIndex === 2 && exQ3Text.trim() === '') return alert('Please write a short dialogue for Q3');
        setSubIndex((s) => s + 1);
        return;
      }
      onNext();
      return;
    }

    if (step.id === 'guardrails') {
      const lastSub = 3; // 0..2 questions, 3 feedback
      if (subIndex < lastSub) {
        if (subIndex === 0 && gQ1Selections.length === 0 && !(gQ1OtherOpen && gQ1OtherText.trim() !== '')) return alert('Please answer Q1 to continue');
        if (subIndex === 1 && gQ2Selection === null && !(gQ2OtherOpen && gQ2OtherText.trim() !== '')) return alert('Please answer Q2 to continue');
        if (subIndex === 2) {
          // require all rows to have a selection
          const missing = guardQ3Rows.find(r => !gQ3Map[r]);
          if (missing) return alert('Please set permissions for all items in Q3 (e.g. never / with my review / independently)');
        }
        setSubIndex((s) => s + 1);
        return;
      }
      onNext();
      return;
    }

    if (step.id === 'preview') {
      const lastSub = 2; // 0: preview, 1: what do you think, 2: accepted
      if (subIndex < lastSub) {
        if (subIndex === 0 && (previewRating ?? 0) <= 0) return alert('Please rate the preview to continue');
        setSubIndex((s) => s + 1);
        return;
      }
      onNext();
      return;
    }

    onNext();
  };

  const ButtonChoice = ({ label, selected, onClick, emoji }: { label: string; selected: boolean; onClick: () => void; emoji?: string }) => (
    <button type="button" onClick={onClick} className={`px-4 py-2 rounded-md border flex items-center gap-2 ${selected ? 'bg-secondary text-black border-transparent' : 'bg-white text-gray-700 border-gray-300'}`}>
      {emoji ? <span aria-hidden className="flag-emoji">{emoji}</span> : null}
      <span>{label}</span>
    </button>
  );

  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    setShowIntro(true);
  }, [step.id]);

  // Preview (step 6)

  useEffect(() => {
    if (step.id === 'preview') return; // preview reset handled in main reset effect
  }, [step.id]);

  // language step
  if (step.id === 'language') {
    return (
      <div className="w-full">
        {showIntro ? (
          <div className="min-h-[180px] flex flex-col items-center justify-center p-8">
            <h3 className="text-2xl font-semibold">{step.label}</h3>
            <p className="text-sm text-gray-500 mt-2">“Let’s set your language preferences”</p>
            <p className="text-sm text-gray-400 mt-1">“This makes sure the Twin speaks in the right voice for you and your clients.”</p>
            <div className="mt-6">
              <button type="button" onClick={() => setShowIntro(false)} className="px-6 py-3 bg-primary text-white rounded-md">Start Step {stepIndex + 1}</button>
            </div>
          </div>
        ) : (
          <>
            <div className=" min-h-[220px]">
              {subIndex === 0 && (
                <div className="space-y-4 text-center">
                  <h4 className="text-lg font-medium">Q1. Which language would you like to complete onboarding in?</h4>
                  <div className="flex justify-center gap-4 mt-4">
                    <ButtonChoice label="English" emoji={'🇬🇧'} selected={onboardingLang === 'English'} onClick={() => setOnboardingLang('English')} />
                    <ButtonChoice label="Dutch" emoji={'🇳🇱'} selected={onboardingLang === 'Dutch'} onClick={() => setOnboardingLang('Dutch')} />
                  </div>
                </div>
              )}

              {subIndex === 1 && (
                <div className="space-y-4 text-center">
                  <h4 className="text-lg font-medium">Q2. Which language should your AI Twin use with clients?</h4>
                  <div className="flex justify-center gap-4 mt-4">
                    <ButtonChoice label="English" emoji={'🇬🇧'} selected={twinLang === 'English'} onClick={() => setTwinLang('English')} />
                    <ButtonChoice label="Dutch" emoji={'🇳🇱'} selected={twinLang === 'Dutch'} onClick={() => setTwinLang('Dutch')} />
                  </div>
                </div>
              )}

              {subIndex === 2 && (
                <div className="text-center">
                  <div className="flex items-center justify-center">
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

            {(subIndex === 0 || subIndex === 1) && (
              <div className="flex justify-between mt-4">
                <button type="button" onClick={() => setSubIndex((s) => Math.max(0, s - 1))} disabled={subIndex === 0} className={`px-4 py-2 rounded-md ${subIndex === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white border border-gray-300 text-gray-700'}`}>
                  Previous
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">{subIndex + 1} / 3</span>
                  <button type="button" onClick={() => {
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

  // Identity & Tone step
  if (step.id === 'identity') {
    return (
      <div className="w-full">
        {showIntro ? (
          <div className="min-h-[180px] flex flex-col items-center justify-center text-center p-8">
            <h2 className="text-2xl font-semibold">Identity & Tone</h2>
            <h4 className="text-lg text-gray-700 mt-2">Let’s capture your voice</h4>
            <p className="text-sm text-gray-500 mt-2">We’ll start with how your clients see you and the words you use.</p>
            <div className="mt-6">
              <button type="button" onClick={() => setShowIntro(false)} className="px-6 py-3 bg-primary text-white rounded-md">Start Step {stepIndex + 1}</button>
            </div>
          </div>
        ) : (
          <>
            <div className=" min-h-[260px]">
              {/* Q1 */}
              {subIndex === 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Q1. What’s one thing your clients often say about you?</h4>
                  <p className="text-sm text-gray-500">Short, personal and unique</p>
                  <div className="mt-4">
                    <input type="text" value={q1Text} onChange={(e) => setQ1Text(e.target.value)} placeholder="e.g. 'You're very clear and practical'" className="w-full p-3 border border-gray-300 rounded-md" />
                  </div>
                </div>
              )}

              {/* Q2 */}
              {subIndex === 1 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Q2. Pick two words that best describe your tone</h4>
                  <p className="text-sm text-gray-500">Select up to 2</p>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {toneOptions.map((t) => (
                      <ButtonChoice key={t} emoji={t === 'Direct' ? '🔊' : t === 'Warm' ? '🤝' : t === 'Curious' ? '❓' : t === 'Challenging' ? '⚡' : t === 'Calm' ? '🌿' : '🔥'} label={t} selected={q2Selections.includes(t)} onClick={() => {
                        setQ2Selections((s) => {
                          if (s.includes(t)) return s.filter(x => x !== t);
                          if (s.length >= 2) return s; // cap at 2
                          return [...s, t];
                        });
                      }} />
                    ))}

                    <div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={q2OtherOpen} onChange={(e) => setQ2OtherOpen(e.target.checked)} aria-label="Other" />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        <span className="ms-3 ml-3 text-sm font-medium text-gray-900">Other</span>
                      </label>
                      {q2OtherOpen && <input type="text" value={q2OtherText} onChange={(e) => setQ2OtherText(e.target.value)} placeholder="Describe" className="w-full mt-2 p-2 border border-gray-300 rounded-md" />}
                    </div>
                  </div>
                </div>
              )}

              {/* Q3 */}
              {subIndex === 2 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Q3. What phrase do you often use with clients?</h4>
                  <p className="text-sm text-gray-500">Pick the phrase you hear yourself saying most often. Your Twin will use it too.</p>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {q3Options.map((o) => (
                      <ButtonChoice key={o} emoji={'💬'} label={o} selected={q3Selection === o} onClick={() => setQ3Selection(o)} />
                    ))}
                    <div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={q3OtherOpen} onChange={(e) => setQ3OtherOpen(e.target.checked)} aria-label="Other" />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        <span className="ms-3 ml-3 text-sm font-medium text-gray-900">Other</span>
                      </label>
                      {q3OtherOpen && <input type="text" value={q3OtherText} onChange={(e) => setQ3OtherText(e.target.value)} placeholder="Your phrase" className="w-full mt-2 p-2 border border-gray-300 rounded-md" />}
                    </div>
                  </div>
                </div>
              )}

              {/* Q4 */}
              {subIndex === 3 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Q4. What phrase would you never use with clients?</h4>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {q4Options.map((o) => (
                      <ButtonChoice key={o} emoji={'🚫'} label={o} selected={q4Selection === o} onClick={() => setQ4Selection(o)} />
                    ))}
                    <div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={q4OtherOpen} onChange={(e) => setQ4OtherOpen(e.target.checked)} aria-label="Other" />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        <span className="ms-3 ml-3 text-sm font-medium text-gray-900">Other</span>
                      </label>
                      {q4OtherOpen && <input type="text" value={q4OtherText} onChange={(e) => setQ4OtherText(e.target.value)} placeholder="Phrase you avoid" className="w-full mt-2 p-2 border border-gray-300 rounded-md" />}
                    </div>
                  </div>
                </div>
              )}

              {/* Q5 */}
              {subIndex === 4 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Q5. Who are your typical clients?</h4>
                  <p className="text-sm text-gray-500">Select all that apply</p>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {q5Options.map((o) => (
                      <ButtonChoice key={o} emoji={'👥'} label={o} selected={q5Selections.includes(o)} onClick={() => setQ5Selections((s) => s.includes(o) ? s.filter(x => x !== o) : [...s, o])} />
                    ))}
                    <div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={q5OtherOpen} onChange={(e) => setQ5OtherOpen(e.target.checked)} aria-label="Other" />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        <span className="ms-3 ml-3 text-sm font-medium text-gray-900">Other</span>
                      </label>
                      {q5OtherOpen && <input type="text" value={q5OtherText} onChange={(e) => setQ5OtherText(e.target.value)} placeholder="Describe" className="w-full mt-2 p-2 border border-gray-300 rounded-md" />}
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback */}
              {subIndex === 5 && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <svg width="96" height="96" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <circle cx="12" cy="12" r="10" fill="#F8F5FB" stroke="#6F3E87" strokeWidth="1.5" />
                      <path d="M15 10c0 1.666-1 3-3 3s-3-1.334-3-3" stroke="#6F3E87" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9 14c0 .667.5 1 1 1h4c.5 0 1-.333 1-1" stroke="#6F3E87" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold mt-2">Your Twin just learned your tone</h2>
                  <p className="text-sm text-gray-500 mt-2">Hi, I’m here to help you reflect. What if we explore what’s holding you back?</p>
                  <div >
                    <button type="button" onClick={() => { setShowIntro(true); setSubIndex(0); }} className="px-4 py-2 rounded-md border bg-white text-gray-700 border-gray-300 mr-3">Revisit questions</button>
                    <button type="button" onClick={goNext} className="px-4 py-2 rounded-md bg-primary text-white">Proceed to Step {stepIndex + 2}</button>
                  </div>
                </div>
              )}
            </div>

            {/* Sub-step navigation */}
            <div className="flex justify-between mt-4">
              <button type="button" onClick={() => setSubIndex((s) => Math.max(0, s - 1))} disabled={subIndex === 0} className={`px-4 py-2 rounded-md ${subIndex === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white border border-gray-300 text-gray-700'}`}>
                Previous
              </button>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{Math.min(subIndex + 1, 6)} / 6</span>
                <button type="button" onClick={() => {
                  const lastSub = 5; // 0..4 questions, 5 feedback
                  if (subIndex < lastSub) {
                    // validation per question
                    if (subIndex === 0 && q1Text.trim() === '') return alert('Please answer Q1 to continue');
                    if (subIndex === 1 && q2Selections.length === 0 && !(q2OtherOpen && q2OtherText.trim() !== '')) return alert('Please select at least one tone for Q2');
                    if (subIndex === 2 && q3Selection === null && q3OtherText.trim() === '') return alert('Please select or enter a phrase for Q3');
                    if (subIndex === 3 && q4Selection === null && !(q4OtherOpen && q4OtherText.trim() !== '')) return alert('Please select a phrase for Q4');
                    setSubIndex((s) => Math.min(lastSub, s + 1));
                    return;
                  }
                  onNext();
                }} className={`px-4 py-2 rounded-md ${((subIndex === 0 && q1Text.trim() === '') || (subIndex === 1 && q2Selections.length === 0 && !(q2OtherOpen && q2OtherText.trim() !== '')) || (subIndex === 2 && q3Selection === null && q3OtherText.trim() === '') || (subIndex === 3 && q4Selection === null && !(q4OtherOpen && q4OtherText.trim() !== ''))) ? 'bg-gray-100 text-gray-400' : 'bg-primary text-white'}`}>
                  {subIndex === 5 ? 'Continue' : (subIndex === 4 ? 'Review' : 'Next')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Method & Beliefs step
  if (step.id === 'method') {
    return (
      <div className="w-full">
        {showIntro ? (
          <div className="min-h-[180px] flex flex-col items-center justify-center text-center p-8">
            <h2 className="text-2xl font-semibold">Method and Beliefs</h2>
            <h4 className="text-lg text-gray-700 mt-2">Your approach to coaching</h4>
            <p className="text-sm text-gray-500 mt-2">We’ll use this to shape how your Twin thinks and frames questions.</p>
            <div className="mt-6">
              <button type="button" onClick={() => setShowIntro(false)} className="px-6 py-3 bg-primary text-white rounded-md">Start Step {stepIndex + 1}</button>
            </div>
          </div>
        ) : (
          <>
            <div className=" min-h-[260px]">
              {/* M Q1 */}
              {subIndex === 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Q1. Which coaching approach best describes your style?</h4>
                  <p className="text-sm text-gray-500">Select one</p>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {methodQ1Options.map((o) => (
                      <ButtonChoice key={o} emoji={'🎯'} label={o} selected={mQ1Selection === o} onClick={() => setMQ1Selection(o)} />
                    ))}
                    <div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={mQ1OtherOpen} onChange={(e) => setMQ1OtherOpen(e.target.checked)} aria-label="Other" />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        <span className="ms-3 ml-3 text-sm font-medium text-gray-900">Other</span>
                      </label>
                      {mQ1OtherOpen && <input type="text" value={mQ1OtherText} onChange={(e) => setMQ1OtherText(e.target.value)} placeholder="Describe" className="w-full mt-2 p-2 border border-gray-300 rounded-md" />}
                    </div>
                  </div>
                </div>
              )}

              {/* M Q2 */}
              {subIndex === 1 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Q2. Real change happens when…</h4>
                  <p className="text-sm text-gray-500">Select one</p>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {methodQ2Options.map((o) => (
                      <ButtonChoice key={o} emoji={'🔎'} label={o} selected={mQ2Selection === o} onClick={() => setMQ2Selection(o)} />
                    ))}
                    <div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={mQ2OtherOpen} onChange={(e) => setMQ2OtherOpen(e.target.checked)} aria-label="Other" />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        <span className="ms-3 ml-3 text-sm font-medium text-gray-900">Other</span>
                      </label>
                      {mQ2OtherOpen && <input type="text" value={mQ2OtherText} onChange={(e) => setMQ2OtherText(e.target.value)} placeholder="Describe" className="w-full mt-2 p-2 border border-gray-300 rounded-md" />}
                    </div>
                  </div>
                </div>
              )}

              {/* M Q3 */}
              {subIndex === 2 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Q3. What metaphor do you often use in sessions?</h4>
                  <p className="text-sm text-gray-500">Select one</p>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {methodQ3Options.map((o) => (
                      <ButtonChoice key={o} emoji={'🌟'} label={o} selected={mQ3Selection === o} onClick={() => setMQ3Selection(o)} />
                    ))}
                    <div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={mQ3OtherOpen} onChange={(e) => setMQ3OtherOpen(e.target.checked)} aria-label="Other" />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        <span className="ms-3 ml-3 text-sm font-medium text-gray-900">Other</span>
                      </label>
                      {mQ3OtherOpen && <input type="text" value={mQ3OtherText} onChange={(e) => setMQ3OtherText(e.target.value)} placeholder="Describe" className="w-full mt-2 p-2 border border-gray-300 rounded-md" />}
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback */}
              {subIndex === 3 && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <svg width="96" height="96" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <circle cx="12" cy="12" r="10" fill="#F8F5FB" stroke="#6F3E87" strokeWidth="1.5" />
                      <path d="M15 12c0 1.666-1 3-3 3s-3-1.334-3-3" stroke="#6F3E87" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold mt-2">Your Twin now understands your worldview.</h2>
                  <p className="text-sm text-gray-500 mt-2">Reflection prompt using belief + metaphor.</p>
                  <div >
                    <button type="button" onClick={() => { setShowIntro(true); setSubIndex(0); }} className="px-4 py-2 rounded-md border bg-white text-gray-700 border-gray-300 mr-3">Revisit questions</button>
                    <button type="button" onClick={goNext} className="px-4 py-2 rounded-md bg-primary text-white">Proceed to Step {stepIndex + 2}</button>
                  </div>
                </div>
              )}
            </div>

            {/* Sub-step navigation */}
            <div className="flex justify-between mt-4">
              <button type="button" onClick={() => setSubIndex((s) => Math.max(0, s - 1))} disabled={subIndex === 0} className={`px-4 py-2 rounded-md ${subIndex === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white border border-gray-300 text-gray-700'}`}>
                Previous
              </button>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{Math.min(subIndex + 1, 4)} / 4</span>
                <button type="button" onClick={() => {
                  const lastSub = 3; // 0..2 questions, 3 feedback
                  if (subIndex < lastSub) {
                    if (subIndex === 0 && mQ1Selection === null && !(mQ1OtherOpen && mQ1OtherText.trim() !== '')) return alert('Please select or enter an approach for Q1');
                    if (subIndex === 1 && mQ2Selection === null && !(mQ2OtherOpen && mQ2OtherText.trim() !== '')) return alert('Please select or enter a belief for Q2');
                    if (subIndex === 2 && mQ3Selection === null && !(mQ3OtherOpen && mQ3OtherText.trim() !== '')) return alert('Please select or enter a metaphor for Q3');
                    setSubIndex((s) => Math.min(lastSub, s + 1));
                    return;
                  }
                  onNext();
                }} className={`px-4 py-2 rounded-md ${((subIndex === 0 && mQ1Selection === null && !(mQ1OtherOpen && mQ1OtherText.trim() !== '')) || (subIndex === 1 && mQ2Selection === null && !(mQ2OtherOpen && mQ2OtherText.trim() !== '')) || (subIndex === 2 && mQ3Selection === null && !(mQ3OtherOpen && mQ3OtherText.trim() !== ''))) ? 'bg-gray-100 text-gray-400' : 'bg-primary text-white'}`}>
                  {subIndex === 3 ? 'Continue' : (subIndex === 2 ? 'Review' : 'Next')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Example in Action step
  if (step.id === 'example') {
    return (
      <div className="w-full">
        {showIntro ? (
          <div className="min-h-[180px] flex flex-col items-center justify-center text-center p-8">
            <h2 className="text-2xl font-semibold">Example in Action</h2>
            <h4 className="text-lg text-gray-700 mt-2">Show us your style in action</h4>
            <p className="text-sm text-gray-500 mt-2">These examples help your Twin respond like you in real sessions.</p>
            <div className="mt-6">
              <button type="button" onClick={() => setShowIntro(false)} className="px-6 py-3 bg-primary text-white rounded-md">Start Step {stepIndex + 1}</button>
            </div>
          </div>
        ) : (
          <>
            <div className=" min-h-[260px]">
              {/* Q1 */}
              {subIndex === 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Q1. Think of a breakthrough moment with a client. What happened?</h4>
                  <p className="text-sm text-gray-500">Select one</p>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {exampleQ1Options.map((o) => (
                      <ButtonChoice key={o} emoji={'🟣'} label={o} selected={exQ1Selection === o} onClick={() => setExQ1Selection(o)} />
                    ))}
                    <div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={exQ1OtherOpen} onChange={(e) => setExQ1OtherOpen(e.target.checked)} aria-label="Other" />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        <span className="ms-3 ml-3 text-sm font-medium text-gray-900">Other</span>
                      </label>
                      {exQ1OtherOpen && <input type="text" value={exQ1OtherText} onChange={(e) => setExQ1OtherText(e.target.value)} placeholder="Describe" className="w-full mt-2 p-2 border border-gray-300 rounded-md" />}
                    </div>
                  </div>
                </div>
              )}

              {/* Q2 */}
              {subIndex === 1 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Q2. What did you say or do that made the difference?</h4>
                  <p className="text-sm text-gray-500">Select one</p>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {exampleQ2Options.map((o) => (
                      <ButtonChoice key={o} emoji={'🔹'} label={o} selected={exQ2Selection === o} onClick={() => setExQ2Selection(o)} />
                    ))}
                    <div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={exQ2OtherOpen} onChange={(e) => setExQ2OtherOpen(e.target.checked)} aria-label="Other" />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        <span className="ms-3 ml-3 text-sm font-medium text-gray-900">Other</span>
                      </label>
                      {exQ2OtherOpen && <input type="text" value={exQ2OtherText} onChange={(e) => setExQ2OtherText(e.target.value)} placeholder="Describe" className="w-full mt-2 p-2 border border-gray-300 rounded-md" />}
                    </div>
                  </div>
                </div>
              )}

              {/* Q3 */}
              {subIndex === 2 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Q3. Write a short dialogue (3–5 lines) from a session.</h4>
                  <p className="text-sm text-gray-500">Free text — golden training data</p>
                  <textarea value={exQ3Text} onChange={(e) => setExQ3Text(e.target.value)} placeholder={"Coach: What’s holding you back?\nClient: Fear.\nCoach: What is that fear protecting?"} className="w-full p-3 border border-gray-300 rounded-md min-h-[120px]" />
                </div>
              )}

              {/* Feedback */}
              {subIndex === 3 && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <svg width="96" height="96" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <circle cx="12" cy="12" r="10" fill="#F8F5FB" stroke="#6F3E87" strokeWidth="1.5" />
                      <path d="M8 13c1 2 6 2 7 0" stroke="#6F3E87" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="9.2" cy="10.6" r=".8" fill="#6F3E87" />
                      <circle cx="14.8" cy="10.6" r=".8" fill="#6F3E87" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold mt-2">Twin just learned how you create breakthroughs.</h2>
                  <p className="text-sm text-gray-500 mt-2">Reflection prompt using belief + metaphor.</p>
                  <div >
                    <button type="button" onClick={() => { setShowIntro(true); setSubIndex(0); }} className="px-4 py-2 rounded-md border bg-white text-gray-700 border-gray-300 mr-3">Revisit questions</button>
                    <button type="button" onClick={goNext} className="px-4 py-2 rounded-md bg-primary text-white">Proceed to Step {stepIndex + 2}</button>
                  </div>
                </div>
              )}
            </div>

            {/* Sub-step navigation */}
            <div className="flex justify-between mt-4">
              <button type="button" onClick={() => setSubIndex((s) => Math.max(0, s - 1))} disabled={subIndex === 0} className={`px-4 py-2 rounded-md ${subIndex === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white border border-gray-300 text-gray-700'}`}>
                Previous
              </button>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{Math.min(subIndex + 1, 4)} / 4</span>
                <button type="button" onClick={() => {
                  const lastSub = 3; // 0..2 questions, 3 feedback
                  if (subIndex < lastSub) {
                    if (subIndex === 0 && exQ1Selection === null && !(exQ1OtherOpen && exQ1OtherText.trim() !== '')) return alert('Please answer Q1 to continue');
                    if (subIndex === 1 && exQ2Selection === null && !(exQ2OtherOpen && exQ2OtherText.trim() !== '')) return alert('Please answer Q2 to continue');
                    if (subIndex === 2 && exQ3Text.trim() === '') return alert('Please write a short dialogue for Q3');
                    setSubIndex((s) => Math.min(lastSub, s + 1));
                    return;
                  }
                  onNext();
                }} className={`px-4 py-2 rounded-md ${((subIndex === 0 && exQ1Selection === null && !(exQ1OtherOpen && exQ1OtherText.trim() !== '')) || (subIndex === 1 && exQ2Selection === null && !(exQ2OtherOpen && exQ2OtherText.trim() !== '')) || (subIndex === 2 && exQ3Text.trim() === '')) ? 'bg-gray-100 text-gray-400' : 'bg-primary text-white'}`}>
                  {subIndex === 3 ? 'Continue' : (subIndex === 2 ? 'Review' : 'Next')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Preview step
  if (step.id === 'preview') {
    const draftFrom = (idx: number) => {
      const tone = q2Selections[0] || 'warm and curious';
      const client = q1Text || 'your client';
      const phrase = q3Selection || q3OtherText || "'Let's explore that together'";
      return `${tone} • ${client} • ${phrase}`;
    };

    const reflectionFrom = (idx: number) => {
      const belief = mQ2Selection || mQ2OtherText || 'real change happens when we commit';
      const metaphor = mQ3Selection || mQ3OtherText || 'riding a bike';
      return `${belief}. Think of it like ${metaphor}. What’s your first pedal stroke?`;
    };

    return (
      <div className="w-full">
        {showIntro ? (
          <div className="min-h-[180px] flex flex-col items-center justify-center text-center p-8">
            <h2 className="text-2xl font-semibold">Preview</h2>
            <h4 className="text-lg text-gray-700 mt-2">Meet the first version of your AI Twin</h4>
            <p className="text-sm text-gray-500 mt-2">Here’s how your Twin might greet and support a client.</p>
            <div className="mt-6">
              <button type="button" onClick={() => setShowIntro(false)} className="px-6 py-3 bg-primary text-white rounded-md">Start Step {stepIndex + 1}</button>
            </div>
          </div>
        ) : (
          <>
            <div className=" min-h-[260px]">
              {/* Single dynamic preview card */}
              <div className={subIndex >= 1 ? "hidden" : "space-y-4"}>
                <div className="rounded-2xl p-6 relative overflow-hidden shadow-2xl preview-card" style={{ minHeight: '160px' }}>
                  {/* background layers for smooth crossfade */}
                  <div className="absolute inset-0 bg-layer" style={{ background: bgGradient, transition: 'opacity 360ms ease', opacity: bgFading ? 0 : 1 }} />
                  {nextBgGradient ? <div className="absolute inset-0 bg-layer" style={{ background: nextBgGradient, transition: 'opacity 360ms ease', opacity: bgFading ? 1 : 0 }} /> : null}

                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div className="text-sm text-gray-700 mb-2">Preview</div>
                    <div className={`demo-text ${demoVisible ? '' : 'fade-hidden'}`}>
                      {previewMessage ? (
                        <>
                          <h3 className="text-lg font-semibold">{previewMessage.msg}</h3>
                          <p className="mt-2 text-sm text-gray-800">{previewMessage.reflection}</p>
                        </>
                      ) : (
                        <>
                          <h3 className="text-lg font-semibold">“Let’s get to the real issue. What’s the cost of not changing this?”</h3>
                          <p className="mt-2 text-sm text-gray-800">“Real change happens when we stop avoiding discomfort. Imagine climbing a mountain — the only way is up. What tough step are you avoiding?”</p>
                        </>
                      )}
                    </div>
                    <div className={`demo-sample mt-3 ${demoVisible ? '' : 'fade-hidden'}`}>
                      <p className="text-sm text-gray-800">{demoContent}</p>
                    </div>
                  </div>
                </div>

                {/* Closeness slider */}
                <div>
                  <label className="text-lg font-semibold text-gray-700">How close is this to your style?</label>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm text-gray-600">Not at all</span>
                    <input type="range" min={1} max={10} value={previewRating} onChange={(e) => setPreviewRating(Number(e.target.value))} onMouseUp={() => setShowAdvancedPreviewControls(true)} onTouchEnd={() => setShowAdvancedPreviewControls(true)} className="flex-1 range-main" />
                    <span className="text-sm text-gray-600">Very close</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">How close: {previewRating}</div>

                  {/* Advanced controls appear after release */}
                  {showAdvancedPreviewControls && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-md">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-gray-700">Directness: <span className="text-xs text-gray-500">Indirect ←→ Very direct</span></label>
                          <input type="range" min={1} max={10} value={directness} onChange={(e) => setDirectness(Number(e.target.value))} onMouseUp={() => commitPreviewFromSliders('directness')} onTouchEnd={() => commitPreviewFromSliders('directness')} className="w-full range-direct mt-2" />
                        </div>
                        <div>
                          <label className="text-sm text-gray-700">Warmth: <span className="text-xs text-gray-500">Cold ←→ Very warm</span></label>
                          <input type="range" min={1} max={10} value={warmth} onChange={(e) => setWarmth(Number(e.target.value))} onMouseUp={() => commitPreviewFromSliders('warmth')} onTouchEnd={() => commitPreviewFromSliders('warmth')} className="w-full range-warm mt-2" />
                        </div>
                        <div>
                          <label className="text-sm text-gray-700">Challenge: <span className="text-xs text-gray-500">Supportive ←→ Confrontational</span></label>
                          <input type="range" min={1} max={10} value={challenge} onChange={(e) => setChallenge(Number(e.target.value))} onMouseUp={() => commitPreviewFromSliders('challenge')} onTouchEnd={() => commitPreviewFromSliders('challenge')} className="w-full range-chal mt-2" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              { /* Removed preview saved step; show What do you think at subIndex === 1 and accepted at subIndex === 2 */ }

              {subIndex === 1 && (
                <div className="text-center space-y-4">
                  <h2 className="text-2xl font-semibold">What do you think?</h2>
                  <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 mt-3 w-100">
                    <button type="button" onClick={() => { setSelectedFeedbackChoice('accept'); setSubIndex(2); }} className="flex-1 w-full px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-md">Yes, this sounds like me</button>
                    <button type="button" onClick={() => { setSelectedFeedbackChoice('tweak'); setSubIndex(0); setShowAdvancedPreviewControls(true); }} className="flex-1 w-full px-4 py-3 border bg-white hover:bg-gray-50 text-gray-700 rounded-md">Not quite, tweak it</button>
                    <button type="button" onClick={() => { setSelectedFeedbackChoice('sharpen'); alert('Sharpen behaviour: coming soon'); }} className="flex-1 w-full px-4 py-3 border bg-white hover:bg-gray-50 text-gray-700 rounded-md">Sharpen behavior</button>
                  </div>

                  <div className="flex items-center justify-center gap-4 mt-4">
                    <span className="text-sm text-gray-600">Rate:</span>
                    <button type="button" onClick={() => setFeedbackThumb(feedbackThumb === 'up' ? null : 'up')} className={`px-3 py-2 rounded-md ${feedbackThumb === 'up' ? 'bg-primary text-white' : 'bg-white border border-gray-200'}`}>👍</button>
                    <button type="button" onClick={() => setFeedbackThumb(feedbackThumb === 'down' ? null : 'down')} className={`px-3 py-2 rounded-md ${feedbackThumb === 'down' ? 'bg-primary text-white' : 'bg-white border border-gray-200'}`}>👎</button>
                  </div>
                </div>
              )}

              {subIndex === 2 && (
                <div className="text-center">
                  <div className="mb-4 text-6xl">🎉</div>
                  <h2 className="text-2xl font-semibold">Your Twin is live.</h2>
                  <p className="text-sm text-gray-500 mt-2">Next, let’s sharpen how it acts in different situations.</p>
                  <div className="mt-4">
                    <button type="button" onClick={() => { onNext(); }} className="px-4 py-2 rounded-md bg-secondary text-black">Next</button>
                  </div>
                </div>
              )}
            </div>

            {/* Sub-step navigation (only on preview substep) */}
            {subIndex === 0 && (
              <div className="flex justify-between mt-4">
                <button type="button" onClick={() => setSubIndex((s) => Math.max(0, s - 1))} disabled={subIndex === 0} className={`px-4 py-2 rounded-md ${subIndex === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white border border-gray-300 text-gray-700'}`}>
                  Previous
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">{Math.min(subIndex + 1, 2)} / 2</span>
                  <button type="button" onClick={() => {
                    const lastSub = 1;
                    if (subIndex < lastSub) {
                      if ((previewRating ?? 0) <= 0) return alert('Please rate the preview to continue');
                      setSubIndex((s) => Math.min(lastSub, s + 1));
                      return;
                    }
                    onNext();
                  }} className={`px-4 py-2 rounded-md ${((previewRating ?? 0) <= 0 ? 'bg-gray-100 text-gray-400' : 'bg-secondary text-black')}`}>
                    {subIndex === 0 ? 'Next' : 'Finish'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Guardrails step
  if (step.id === 'guardrails') {
    return (
      <div className="w-full">
        {showIntro ? (
          <div className="min-h-[180px] flex flex-col items-center justify-center text-center p-8">
            <h2 className="text-2xl font-semibold">Guardrails</h2>
            <h4 className="text-lg text-gray-700 mt-2">Set your guardrails</h4>
            <p className="text-sm text-gray-500 mt-2">This ensures the Twin stays within your boundaries.</p>
            <div className="mt-6">
              <button type="button" onClick={() => setShowIntro(false)} className="px-6 py-3 bg-primary text-white rounded-md">Start Step {stepIndex + 1}</button>
            </div>
          </div>
        ) : (
          <>
            <div className=" min-h-[260px]">
              {/* Q1 */}
              {subIndex === 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Q1. What should your AI Twin never do?</h4>
                  <p className="text-sm text-gray-500">Select all that apply</p>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {guardQ1Options.map((o) => (
                      <ButtonChoice key={o} emoji={'🚫'} label={o} selected={gQ1Selections.includes(o)} onClick={() => setGQ1Selections((s) => s.includes(o) ? s.filter(x => x !== o) : [...s, o])} />
                    ))}
                    <div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={gQ1OtherOpen} onChange={(e) => setGQ1OtherOpen(e.target.checked)} aria-label="Other" />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        <span className="ms-3 ml-3 text-sm font-medium text-gray-900">Other</span>
                      </label>
                      {gQ1OtherOpen && <input type="text" value={gQ1OtherText} onChange={(e) => setGQ1OtherText(e.target.value)} placeholder="Describe" className="w-full mt-2 p-2 border border-gray-300 rounded-md" />}
                    </div>
                  </div>
                </div>
              )}

              {/* Q2 */}
              {subIndex === 1 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Q2. How should clients know they are talking to the AI, not you?</h4>
                  <p className="text-sm text-gray-500">Select one</p>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {guardQ2Options.map((o) => (
                      <ButtonChoice key={o} emoji={'ℹ️'} label={o} selected={gQ2Selection === o} onClick={() => setGQ2Selection(o)} />
                    ))}
                    <div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={gQ2OtherOpen} onChange={(e) => setGQ2OtherOpen(e.target.checked)} aria-label="Other" />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        <span className="ms-3 ml-3 text-sm font-medium text-gray-900">Other</span>
                      </label>
                      {gQ2OtherOpen && <input type="text" value={gQ2OtherText} onChange={(e) => setGQ2OtherText(e.target.value)} placeholder="Describe" className="w-full mt-2 p-2 border border-gray-300 rounded-md" />}
                    </div>
                  </div>
                </div>
              )}

              {/* Q3 */}
              {subIndex === 2 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Q3. Where may the AI support clients?</h4>
                  <p className="text-sm text-gray-500">Choose a permission level for each area</p>
                  <div className="mt-4 overflow-auto">
                    <table className="w-full table-auto border-collapse border border-gray-200">
                      <thead>
                        <tr>
                          <th className="text-left p-2"></th>
                          <th className="p-2 text-center">Never</th>
                          <th className="p-2 text-center">With my review</th>
                          <th className="p-2 text-center">Independently</th>
                        </tr>
                      </thead>
                      <tbody>
                        {guardQ3Rows.map((r) => (
                          <tr key={r} className={`border-t border-gray-200 ${gQ3Map[r] ? 'bg-[#FAF3FF]' : ''}`}>
                            <td className="p-2">{r}</td>
                            <td className="p-2 text-center">
                              <input type="radio" name={"gq3-" + r} checked={gQ3Map[r] === 'never'} onChange={() => setGQ3Map((m) => ({ ...m, [r]: 'never' }))} />
                            </td>
                            <td className="p-2 text-center">
                              <input type="radio" name={"gq3-" + r} checked={gQ3Map[r] === 'review'} onChange={() => setGQ3Map((m) => ({ ...m, [r]: 'review' }))} />
                            </td>
                            <td className="p-2 text-center">
                              <input type="radio" name={"gq3-" + r} checked={gQ3Map[r] === 'independent'} onChange={() => setGQ3Map((m) => ({ ...m, [r]: 'independent' }))} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Feedback */}
              {subIndex === 3 && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <svg width="96" height="96" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <rect x="3" y="3" width="18" height="18" rx="3" fill="#F0F9F6" stroke="#0F766E" strokeWidth="1.2" />
                      <path d="M7 12l2.5 2.5L17 7" stroke="#0F766E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold mt-2">Boundaries saved. You stay in control.</h2>
                  <p className="text-sm text-gray-500 mt-2">Your preferences will keep the Twin aligned with your practice.</p>
                  <div >
                    <button type="button" onClick={() => { setShowIntro(true); setSubIndex(0); }} className="px-4 py-2 rounded-md border bg-white text-gray-700 border-gray-300 mr-3">Revisit questions</button>
                    <button type="button" onClick={goNext} className="px-4 py-2 rounded-md bg-primary text-white">Proceed to Step {stepIndex + 2}</button>
                  </div>
                </div>
              )}
            </div>

            {/* Sub-step navigation */}
            <div className="flex justify-between mt-4">
              <button type="button" onClick={() => setSubIndex((s) => Math.max(0, s - 1))} disabled={subIndex === 0} className={`px-4 py-2 rounded-md ${subIndex === 0 ? 'bg-gray-100 text-gray-400' : 'bg-white border border-gray-300 text-gray-700'}`}>
                Previous
              </button>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{Math.min(subIndex + 1, 4)} / 4</span>
                <button type="button" onClick={() => {
                  const lastSub = 3; // 0..2 questions, 3 feedback
                  if (subIndex < lastSub) {
                    if (subIndex === 0 && gQ1Selections.length === 0 && !(gQ1OtherOpen && gQ1OtherText.trim() !== '')) return alert('Please answer Q1 to continue');
                    if (subIndex === 1 && gQ2Selection === null && !(gQ2OtherOpen && gQ2OtherText.trim() !== '')) return alert('Please answer Q2 to continue');
                    if (subIndex === 2) {
                      const missing = guardQ3Rows.find(r => !gQ3Map[r]);
                      if (missing) return alert('Please set permissions for all items in Q3 (e.g. never / with my review / independently)');
                    }
                    setSubIndex((s) => Math.min(lastSub, s + 1));
                    return;
                  }
                  onNext();
                }} className={`px-4 py-2 rounded-md ${((subIndex === 0 && gQ1Selections.length === 0 && !(gQ1OtherOpen && gQ1OtherText.trim() !== '')) || (subIndex === 1 && gQ2Selection === null && !(gQ2OtherOpen && gQ2OtherText.trim() !== '')) || (subIndex === 2 && Object.values(gQ3Map).some(v => !v))) ? 'bg-gray-100 text-gray-400' : 'bg-primary text-white'}`}>
                  {subIndex === 3 ? 'Continue' : (subIndex === 2 ? 'Review' : 'Next')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Fallback generic panel (no bottom navigation)
  return (
    <div >
      <h3 className="text-xl font-semibold mb-2">Step {stepIndex + 1}: {step.label}</h3>
      <div className=" min-h-[200px] flex items-center justify-center text-gray-400">
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
    { id: 'preview', label: 'Preview' },
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
              src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo.svg`}
              alt="CoachNova"
              className="logo"
            />
          </div>

          {showStepper && <Stepper steps={steps} current={currentStep} stepProgress={stepProgress} onJump={(i) => setCurrentStep(i)} />}

          <div className="jumbotron">
            <div className="title-section flex flex-col gap-8">
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
                  <div className={`progress-segment ${(stepProgress[steps[currentStep].id] || 0) >= 1 ? 'active' : ''}`}>
                    <div className="progress-inner" style={{ width: `${(stepProgress[steps[currentStep].id] || 0) * 100}%` }} />
                  </div>
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
