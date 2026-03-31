"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { useEffect, useRef, useState } from "react"

interface StatRectangleProps {
  label: string
  value: string
  valueColor?: string
  icon?: ReactNode
  index?: number // For staggered animations
}

export function StatRectangle({ label, value, valueColor = "text-[var(--foreground)] font-bold", icon, index = 0 }: StatRectangleProps) {
  const [isHighlighted, setIsHighlighted] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const previousValue = useRef<string | null>(null)

  // Track when component mounts
  useEffect(() => {
    setIsMounted(true)
    const timer = setTimeout(() => setHasAnimated(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  // Detect value changes
  useEffect(() => {
    if (!isMounted) return
    
    if (previousValue.current === null) {
      // First render - set initial value
      previousValue.current = value
      return
    }

    if (previousValue.current !== value) {
      setIsHighlighted(true)
      const timer = setTimeout(() => setIsHighlighted(false), 2500)
      previousValue.current = value
      return () => clearTimeout(timer)
    }
  }, [value, isMounted])

  return (
    <motion.div
      initial={{ opacity: 0, y: -15, scale: 0.9 }}
      animate={isMounted ? { 
        opacity: 1, 
        y: 0, 
        scale: 1,
      } : { opacity: 0 }}
      transition={{ 
        duration: 0.5,
        delay: index * 0.12,
        type: "spring",
        stiffness: 250,
        damping: 20
      }}
      whileHover={{ 
        scale: 1.04,
        transition: { duration: 0.2 }
      }}
      className="bg-white dark:bg-[#1e2939] px-3 py-1.5 rounded-full border-0 flex items-center gap-2 relative overflow-hidden"
    >
      {/* Subtle glow background when value changes */}
      {isHighlighted && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-green-400/8 to-green-500/10 rounded-full"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ 
            opacity: [0, 0.3, 0.15, 0],
            scale: [0.98, 1.02, 1.01, 1]
          }}
          transition={{ 
            duration: 2.5,
            ease: "easeOut"
          }}
        />
      )}
      
      {/* Subtle periodic pulse - removed for cleaner look */}
      
      {icon && (
        <motion.div
          className="relative z-10"
          animate={isHighlighted ? { 
            scale: [1, 1.08, 1],
            rotate: [0, 5, -5, 0]
          } : {}}
          transition={{ duration: 0.6 }}
        >
      {icon}
        </motion.div>
      )}
      
      {/* Text with subtle green accent */}
      <motion.span 
        className="relative z-10 font-semibold text-green-600 dark:text-green-500"
        animate={isHighlighted ? {
          color: ["#16a34a", "#15803d", "#16a34a", "#16a34a"],
        } : {}}
        transition={{
          duration: 2.5,
          ease: "easeInOut"
        }}
      >
        {label}: <motion.span 
          key={value}
          className={valueColor}
          initial={{ scale: 1 }}
          animate={isHighlighted ? { 
            scale: [1, 1.08, 1.02, 1],
            color: ["inherit", "#22c55e", "#16a34a", "inherit"]
          } : {}}
          transition={{ 
            duration: 0.8,
            ease: "easeInOut"
          }}
        >
          {value.toLocaleString()}
        </motion.span>
      </motion.span>
    </motion.div>
  )
}
