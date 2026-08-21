"use client"

import * as SliderPrimitive from "@radix-ui/react-slider"

interface DistributionSliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  max?: number
}

export function DistributionSlider({
  value,
  onValueChange,
  max = 100,
}: DistributionSliderProps) {
  return (
    <SliderPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      max={max}
      step={1}
      className="relative flex items-center select-none touch-none w-full h-5"
    >
      <SliderPrimitive.Track className="relative grow rounded-full h-1.5 bg-surface-container-highest">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-gradient-to-r from-electric-purple to-electric-teal" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block w-5 h-5 rounded-full bg-electric-purple shadow-lg shadow-electric-purple/30 focus:outline-none focus:ring-2 focus:ring-electric-purple/50 hover:scale-110 transition-transform cursor-grab active:cursor-grabbing" />
    </SliderPrimitive.Root>
  )
}
