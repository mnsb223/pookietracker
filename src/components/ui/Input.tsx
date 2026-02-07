import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement>

export default function Input(props: Props) {
  return (
    <input
      {...props}
      className={[
        'w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100',
        'placeholder:text-zinc-600',
        'focus:outline-none focus:ring-2 focus:ring-pink-400/40 focus:border-pink-400/40',
        props.className ?? '',
      ].join(' ')}
    />
  )
}
