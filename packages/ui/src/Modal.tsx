'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function Modal({ open, onClose, children, className }: ModalProps) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={cx('bg-[#0D1117] border border-[#1A2332] rounded-2xl w-full max-w-lg shadow-2xl', className)}>
        {children}
      </div>
    </div>
  )
}
