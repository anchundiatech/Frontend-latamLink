"use client"

import { useState } from "react"
import Image from "next/image";

export function Logo({ className = "", size = 40 }: { className?: string; size?: number }) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <span
        className="font-heading font-bold text-electric-teal"
        style={{ fontSize: size * 0.5 }}
      >
        LP
      </span>
    )
  }

  return (
    <Image
      src="/Logo.webp"
      alt="LatamLink Pay"
      width={size}
      height={size}
      className={className}
      onError={() => setError(true)}
      style={{ objectFit: "contain" }}
    />
  )
}
