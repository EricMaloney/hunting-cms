'use client'

import { useState, useMemo } from 'react'
import type { Submission } from '@/types'

interface ContentCalendarProps {
  submissions: Submission[]
}

const STATUS_DOT: Record<string, string> = {
  live: 'bg-green-500',
  approved: 'bg-blue-500',
  pending: 'bg-amber-500',
}

const STATUS_PILL: Record<string, string> = {
  live: 'bg-green-100 text-green-700',
  approved: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function ContentCalendar({ submissions }: ContentCalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const goToPrev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  const goToNext = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }
  const goToToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDay(null)
  }

  // Build calendar grid (days including prev/next month padding)
  const gridDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPad = firstDay.getDay()
    const days: { date: Date; currentMonth: boolean }[] = []

    // Pad before
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({ date: d, currentMonth: false })
    }
    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(year, month, d), currentMonth: true })
    }
    // Pad after to complete grid (6 rows)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), currentMonth: false })
    }

    return days
  }, [year, month])

  // Map submissions to days
  const submissionsByDay = useMemo(() => {
    const map = new Map<string, Submission[]>()
    for (const sub of submissions) {
      if (!sub.schedule_start) continue
      const start = new Date(sub.schedule_start)
      const end = sub.schedule_end ? new Date(sub.schedule_end) : start

      // Add to each day it spans (within the visible range for perf)
      let cursor = new Date(start)
      cursor.setHours(0, 0, 0, 0)
      const endCopy = new Date(end)
      endCopy.setHours(23, 59, 59, 999)

      while (cursor <= endCopy) {
        const key = dateKey(cursor)
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(sub)
        cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
      }
    }
    return map
  }, [submissions])

  const selectedDaySubmissions = selectedDay
    ? (submissionsByDay.get(dateKey(selectedDay)) || [])
    : []

  return (
    <div>
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToPrev}
            className="p-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="p-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
        {Object.entries(STATUS_DOT).map(([status, cls]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${cls}`} />
            <span className="capitalize">{status}</span>
          </span>
        ))}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 border-l border-t border-gray-200 rounded-lg overflow-hidden">
        {gridDays.map(({ date, currentMonth }, idx) => {
          const key = dateKey(date)
          const daySubs = submissionsByDay.get(key) || []
          const isToday = isSameDay(date, today)
          const isSelected = selectedDay && isSameDay(date, selectedDay)

          return (
            <div
              key={idx}
              onClick={() => {
                setSelectedDay(isSelected ? null : date)
              }}
              className={`border-r border-b border-gray-200 p-1 sm:p-2 min-h-[60px] sm:min-h-[80px] cursor-pointer transition-colors ${
                currentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100/50'
              } ${isSelected ? 'ring-2 ring-inset ring-[#1a1a2e]' : ''}`}
            >
              <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                isToday
                  ? 'bg-[#1a1a2e] text-white'
                  : currentMonth
                  ? 'text-gray-900'
                  : 'text-gray-300'
              }`}>
                {date.getDate()}
              </div>

              {daySubs.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {daySubs.slice(0, 3).map((sub) => (
                    <span
                      key={sub.id}
                      className={`w-2 h-2 rounded-full ${STATUS_DOT[sub.status] || 'bg-gray-400'}`}
                      title={sub.title}
                    />
                  ))}
                  {daySubs.length > 3 && (
                    <span className="text-xs text-gray-400">+{daySubs.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected day panel */}
      {selectedDay && (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">
              {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {selectedDaySubmissions.length === 0 ? (
            <p className="text-sm text-gray-400">No content scheduled for this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedDaySubmissions.map((sub) => (
                <div key={sub.id} className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[sub.status] || 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{sub.title}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_PILL[sub.status] || 'bg-gray-100 text-gray-600'}`}>
                        {sub.status}
                      </span>
                      {sub.user?.name && (
                        <span className="text-xs text-gray-400">{sub.user.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
