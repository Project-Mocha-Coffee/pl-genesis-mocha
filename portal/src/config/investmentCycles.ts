// Investment Cycle Configuration
// These dates control when investment cycles open/close and when yields become available

export const INVESTMENT_CYCLES = {
  // Current investment cycle
  currentCycle: {
    openDate: new Date('2024-01-01'), // When current cycle opened
    closeDate: new Date('2024-12-31'), // When current cycle closes
    firstYieldDate: new Date('2025-03-31'), // Q1 - First annual yield becomes available
  },
  // Next investment cycle (if applicable)
  nextCycle: {
    openDate: new Date('2025-01-01'),
    closeDate: new Date('2025-12-31'),
    firstYieldDate: new Date('2026-03-31'),
  }
}

// Calculate which cycle we're in and relevant dates
export function getCurrentCycleInfo() {
  const now = new Date()
  const current = INVESTMENT_CYCLES.currentCycle
  const next = INVESTMENT_CYCLES.nextCycle

  // Check if we're in current cycle
  if (now >= current.openDate && now <= current.closeDate) {
    return {
      cycle: 'current' as const,
      openDate: current.openDate,
      closeDate: current.closeDate,
      firstYieldDate: current.firstYieldDate,
      isOpen: true,
      isClosed: false,
    }
  }

  // Check if we're past current cycle but before next
  if (now > current.closeDate && now < next.openDate) {
    return {
      cycle: 'between' as const,
      openDate: next.openDate,
      closeDate: next.closeDate,
      firstYieldDate: next.firstYieldDate,
      isOpen: false,
      isClosed: true,
    }
  }

  // Check if we're in next cycle
  if (now >= next.openDate) {
    return {
      cycle: 'next' as const,
      openDate: next.openDate,
      closeDate: next.closeDate,
      firstYieldDate: next.firstYieldDate,
      isOpen: true,
      isClosed: false,
    }
  }

  // Before first cycle
  return {
    cycle: 'upcoming' as const,
    openDate: current.openDate,
    closeDate: current.closeDate,
    firstYieldDate: current.firstYieldDate,
    isOpen: false,
    isClosed: false,
  }
}

// Calculate time until a date
export function getTimeUntil(targetDate: Date) {
  const now = new Date()
  const diff = targetDate.getTime() - now.getTime()

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, isPast: false }
}

