'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Props {
  userName: string
  submissionCount: number
}

const STEPS = [
  {
    number: '1',
    title: 'Submit Content',
    description: 'Upload an image or video to display on the digital screens.',
    href: '/dashboard/submit',
    external: false,
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
  },
  {
    number: '2',
    title: 'Request a Design',
    description: 'Need something custom? Ask the design team to create it.',
    href: '/request',
    external: true,
    color: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-600',
  },
  {
    number: '3',
    title: 'Track Your Status',
    description: 'Follow your submissions through review, approval, and go-live.',
    href: '/dashboard/submissions',
    external: false,
    color: 'bg-green-50 border-green-200',
    iconColor: 'text-green-600',
  },
]

export function WelcomeBanner({ userName, submissionCount }: Props) {
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid flash

  useEffect(() => {
    // ?welcome=1 in the URL forces the banner to show (for preview/testing)
    const forceShow = new URLSearchParams(window.location.search).get('welcome') === '1'
    const isDismissed = !forceShow && localStorage.getItem('hss_welcome_dismissed') === 'true'
    if (!isDismissed && (submissionCount === 0 || forceShow)) {
      setDismissed(false)
    }
  }, [submissionCount])

  const handleDismiss = () => {
    localStorage.setItem('hss_welcome_dismissed', 'true')
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-6 text-white mb-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-bold">Welcome to the Content CMS, {userName}! 👋</h2>
          <p className="text-white/70 text-sm mt-1">
            Here&apos;s how to get your content on the displays in three steps.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1.5 text-white/50 hover:text-white rounded-lg transition-colors"
          aria-label="Dismiss welcome"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STEPS.map((step) => {
          const inner = (
            <>
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {step.number}
              </div>
              <div>
                <p className="font-semibold text-sm text-white">{step.title}</p>
                <p className="text-white/60 text-xs mt-0.5 leading-relaxed">{step.description}</p>
              </div>
            </>
          )

          const className = "flex items-start gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/15 transition-colors"

          return step.external ? (
            <a key={step.title} href={step.href} target="_blank" rel="noopener noreferrer" className={className}>
              {inner}
            </a>
          ) : (
            <Link key={step.title} href={step.href} className={className}>
              {inner}
            </Link>
          )
        })}
      </div>

      <button
        onClick={handleDismiss}
        className="mt-4 text-xs text-white/40 hover:text-white/70 transition-colors"
      >
        Got it, don&apos;t show this again
      </button>
    </div>
  )
}
