'use client'

import type { Tag } from '@/types'

interface Props {
  tags: Tag[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  className?: string
}

export function TagPicker({ tags, selectedIds, onChange, className = '' }: Props) {
  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id]
    )
  }

  if (tags.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => {
        const selected = selectedIds.includes(tag.id)
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            style={selected ? { backgroundColor: tag.color, borderColor: tag.color, color: '#fff' } : { borderColor: tag.color + '60', color: tag.color }}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              selected ? 'shadow-sm' : 'bg-white hover:opacity-80'
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: selected ? '#ffffff99' : tag.color }}
            />
            {tag.name}
          </button>
        )
      })}
    </div>
  )
}
