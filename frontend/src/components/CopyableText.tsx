import { useState } from 'react'

export function CopyableText({
  text,
  label,
  as = 'span',
}: {
  text: string
  label: string
  as?: 'span' | 'code'
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard?.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  const ValueTag = as

  return (
    <span className="copyable-text">
      <ValueTag>{text}</ValueTag>
      <button
        type="button"
        className="copyable-text__button"
        aria-label={`Copy ${label}`}
        onClick={() => {
          void copy()
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </span>
  )
}
