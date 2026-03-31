"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { formatUnits } from "viem"
import { Coffee, Cherry, TrendingUp } from "lucide-react"
import { getCurrentCycleInfo } from "@/config/investmentCycles"

interface CoffeeGardenVisualizationProps {
  totalBondsOwned: bigint
  annualInterest: number
  cumulativeReturn: number
  isLoading?: boolean
  MBT_DECIMALS?: number
}

type TreeStage = "seedling" | "young" | "mature" | "flowering" | "cherry"

interface Tree {
  id: string
  stage: TreeStage
  progress: number // 0-100
  x: number
  y: number
}

const TREE_STAGES: TreeStage[] = ["seedling", "young", "mature", "flowering", "cherry"]
const STAGE_THRESHOLD = 20 // Each stage represents 20% of maturity

export function CoffeeGardenVisualization({
  totalBondsOwned,
  annualInterest,
  cumulativeReturn,
  isLoading = false,
  MBT_DECIMALS = 18
}: CoffeeGardenVisualizationProps) {
  const [trees, setTrees] = useState<Tree[]>([])
  const [hoveredTree, setHoveredTree] = useState<string | null>(null)

  // Calculate total investment value
  const totalInvestmentMBT = useMemo(() => {
    if (!totalBondsOwned) return 0
    return Number(formatUnits(totalBondsOwned, MBT_DECIMALS))
  }, [totalBondsOwned, MBT_DECIMALS])

  // IMPORTANT: Two separate concepts:
  // 1. GARDEN SIZE = Investment amount (how many trees you have)
  // 2. GROWTH MATURITY = Time-based progression (affects yield availability)
  //
  // Growth Maturity Stages (TIME-BASED, not amount-based):
  // 0-20%: Seedling (new investment, bond purchase period) - Before Q1
  // 20-40%: Young tree (post bond period, approaching Q1) - Approaching Q1
  // 40-60%: Mature tree (Q1 reached, first yield available) - Q1 passed, yields accruing
  // 60-80%: Flowering (annual yields accruing) - Multiple yield cycles
  // 80-100%: Cherry/Harvest (full maturity) - Near end of investment term
  //
  // Garden Size (AMOUNT-BASED):
  // Determines how many trees are displayed (1 tree = 4 MBT)
  const maturityPercentage = useMemo(() => {
    if (totalInvestmentMBT === 0) return 0
    
    const cycleInfo = getCurrentCycleInfo()
    const now = new Date()
    const firstYieldDate = cycleInfo.firstYieldDate
    const timeUntilYield = firstYieldDate.getTime() - now.getTime()
    
    // Growth maturity is TIME-BASED, not amount-based
    // All investments progress through the same growth cycle regardless of amount
    
    // Stage 1 (0-20%): Seedling - Before Q1 (bond purchase period)
    // Stage 2 (20-40%): Young - Approaching Q1
    // Stage 3 (40-60%): Mature - Q1 reached, first yield available
    // Stage 4 (60-80%): Flowering - Yields accruing
    // Stage 5 (80-100%): Cherry - Near maturity
    
    let maturity = 0
    
    if (timeUntilYield > 0) {
      // Before Q1 - Calculate progress toward Q1
      // Assume bond purchase period is ~3 months before Q1
      const bondPeriodEnd = new Date(firstYieldDate)
      bondPeriodEnd.setMonth(bondPeriodEnd.getMonth() - 3)
      
      const totalTimeToQ1 = firstYieldDate.getTime() - bondPeriodEnd.getTime()
      const timeSinceBondEnd = now.getTime() - bondPeriodEnd.getTime()
      
      if (timeSinceBondEnd < 0) {
        // Still in bond purchase period - Seedling stage (0-20%)
        maturity = Math.max(0, (Math.abs(timeSinceBondEnd) / (bondPeriodEnd.getTime() - now.getTime())) * 20)
      } else {
        // Past bond period, approaching Q1 - Young stage (20-40%)
        const progressToQ1 = Math.min(1, timeSinceBondEnd / totalTimeToQ1)
        maturity = 20 + (progressToQ1 * 20) // 20-40%
      }
    } else {
      // Q1 has passed - Mature stage and beyond
      // Calculate maturity based on time since Q1 and returns
      const timeSinceQ1 = now.getTime() - firstYieldDate.getTime()
      const oneYear = 365 * 24 * 60 * 60 * 1000 // 1 year in milliseconds
      
      if (cumulativeReturn > 0) {
        // We have returns - at least Mature stage (40%)
        // Progress through Flowering (60-80%) and Cherry (80-100%) based on time
        const yearsSinceQ1 = timeSinceQ1 / oneYear
        if (yearsSinceQ1 < 1) {
          // First year after Q1 - Mature to Flowering (40-60%)
          maturity = 40 + (yearsSinceQ1 * 20)
        } else if (yearsSinceQ1 < 2) {
          // Second year - Flowering (60-80%)
          maturity = 60 + ((yearsSinceQ1 - 1) * 20)
        } else {
          // Beyond second year - Cherry (80-100%)
          maturity = Math.min(100, 80 + ((yearsSinceQ1 - 2) * 10))
        }
      } else {
        // Q1 passed but no returns yet - Mature stage (40%)
        maturity = 40
      }
    }
    
    return Math.min(100, Math.max(0, maturity))
  }, [cumulativeReturn, totalInvestmentMBT])

  // Generate trees based on investment amount
  useEffect(() => {
    if (isLoading || totalInvestmentMBT === 0) {
      setTrees([])
      return
    }

    // Each tree represents ~$100 investment (4 MBT)
    const treeCount = Math.max(1, Math.floor(totalInvestmentMBT / 4))
    const maxTrees = 20 // Limit display to 20 trees for performance

    const newTrees: Tree[] = []
    for (let i = 0; i < Math.min(treeCount, maxTrees); i++) {
      const progress = maturityPercentage + (i % 5) * 2 // Vary progress slightly
      const stageIndex = Math.floor(progress / STAGE_THRESHOLD)
      const stage = TREE_STAGES[Math.min(stageIndex, TREE_STAGES.length - 1)] as TreeStage

      newTrees.push({
        id: `tree-${i}`,
        stage,
        progress: Math.min(100, progress),
        x: (i % 5) * 20 + 10 + Math.random() * 5, // Grid layout with slight randomness
        y: Math.floor(i / 5) * 25 + 10 + Math.random() * 5
      })
    }

    setTrees(newTrees)
  }, [totalInvestmentMBT, maturityPercentage, isLoading])

  const getTreeEmoji = (stage: TreeStage) => {
    switch (stage) {
      case "seedling": return "🌱"
      case "young": return "🌿"
      case "mature": return "🌳"
      case "flowering": return "🌸"
      case "cherry": return "🍒"
      default: return "🌱"
    }
  }

  const getTreeColor = (stage: TreeStage) => {
    switch (stage) {
      case "seedling": return "text-green-300"
      case "young": return "text-green-400"
      case "mature": return "text-green-600"
      case "flowering": return "text-pink-400"
      case "cherry": return "text-red-500"
      default: return "text-green-400"
    }
  }

  const getStageLabel = (stage: TreeStage) => {
    switch (stage) {
      case "seedling": return "New Investment"
      case "young": return "Growing"
      case "mature": return "Mature"
      case "flowering": return "Flowering"
      case "cherry": return "Harvest Ready"
      default: return "Growing"
    }
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20 rounded-xl p-8 border-2 border-green-200 dark:border-green-800">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    )
  }

  if (totalInvestmentMBT === 0) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20 rounded-xl p-8 border-2 border-green-200 dark:border-green-800">
        <div className="text-center py-12">
          <Coffee className="w-16 h-16 mx-auto mb-4 text-green-400" />
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            Start Your Coffee Garden
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Invest in trees to see them grow and mature into cherries!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20 rounded-xl p-4 border-2 border-green-200 dark:border-green-800">
      {/* Header with Title */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
          <span className="text-2xl">🌳</span>
          Your Coffee Garden
        </h3>
        
        {/* Clear Two-Part Display - Side by Side */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Garden Size Card - Investment Amount */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-3 border-2 border-blue-300 dark:border-blue-700 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-lg">📊</div>
            <div className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
              How Many Trees?
            </div>
          </div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-1">
            {(totalInvestmentMBT / 4).toFixed(3)} Trees
          </div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 opacity-80">
            {totalInvestmentMBT.toFixed(4)} MBT invested
          </div>
          <div className="text-[9px] text-blue-500 dark:text-blue-400 mt-1">
            💰 More investment = More trees
          </div>
          </div>
          
          {/* Growth Stage Card - Time-Based */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-lg p-3 border-2 border-amber-300 dark:border-amber-700 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-lg">⏱️</div>
            <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
              When Returns Available?
            </div>
          </div>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-1">
            {getStageLabel(TREE_STAGES[Math.min(Math.floor(maturityPercentage / STAGE_THRESHOLD), TREE_STAGES.length - 1)] as TreeStage)}
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 opacity-80">
            {maturityPercentage.toFixed(0)}% through growth cycle
          </div>
          <div className="text-[9px] text-amber-500 dark:text-amber-400 mt-1">
            ⏰ Same for all investors
          </div>
          </div>
        </div>
      </div>

      {/* Header Stats - Simplified */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="text-center bg-white/60 dark:bg-gray-800/60 rounded-lg p-2">
          <div className="text-xl font-bold text-green-600 dark:text-green-400">
            {trees.length}
          </div>
          <div className="text-[10px] text-gray-600 dark:text-gray-400">Trees Invested</div>
        </div>
        <div className="text-center bg-white/60 dark:bg-gray-800/60 rounded-lg p-2">
          <div className="text-xl font-bold text-pink-600 dark:text-pink-400">
            {trees.filter(t => t.stage === "cherry" || t.stage === "flowering").length}
          </div>
          <div className="text-[10px] text-gray-600 dark:text-gray-400">Mature Trees</div>
        </div>
        <div className="text-center bg-white/60 dark:bg-gray-800/60 rounded-lg p-2">
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
            {maturityPercentage.toFixed(0)}%
          </div>
          <div className="text-[10px] text-gray-600 dark:text-gray-400">Growth Progress</div>
        </div>
      </div>

      {/* Growth Cycle Progress - Clear Visual Indicator */}
      <div className="mb-3 bg-gradient-to-r from-green-50 to-amber-50 dark:from-green-900/20 dark:to-amber-900/20 rounded-lg p-3 border-2 border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">⏱️</span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">When Will I Get My Returns?</span>
          </div>
          <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded-full">
            {getStageLabel(TREE_STAGES[Math.min(Math.floor(maturityPercentage / STAGE_THRESHOLD), TREE_STAGES.length - 1)] as TreeStage)}
          </span>
        </div>
        <div className="text-[10px] text-gray-600 dark:text-gray-400 mb-2 text-center bg-white/60 dark:bg-gray-800/60 rounded p-2">
          <strong>Your trees grow over time</strong> - The more mature they are, the closer you are to receiving your annual returns. 
          This progress is the same for all investors, regardless of how much you invested.
        </div>
        {/* Stage Progress Bar with Icons - Like Candy Crush */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            {TREE_STAGES.map((stage, idx) => {
              const stageProgress = (idx + 1) * 20;
              const isActive = maturityPercentage >= stageProgress - 20;
              const isCurrent = maturityPercentage >= stageProgress - 20 && maturityPercentage < stageProgress;
              const currentStage = TREE_STAGES[Math.min(Math.floor(maturityPercentage / STAGE_THRESHOLD), TREE_STAGES.length - 1)];
              return (
                <div key={stage} className="flex flex-col items-center flex-1 relative">
                  <motion.div
                    className={`text-2xl ${isActive ? getTreeColor(stage) : 'text-gray-300 dark:text-gray-600'} transition-all duration-300`}
                    animate={isCurrent ? { scale: [1, 1.2, 1], y: [0, -5, 0] } : {}}
                    transition={{ duration: 2, repeat: isCurrent ? Infinity : 0 }}
                  >
                    {getTreeEmoji(stage)}
                  </motion.div>
                  {isCurrent && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                  {stage === currentStage && (
                    <div className="text-[8px] font-bold text-green-600 dark:text-green-400 mt-1">
                      Current
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-green-400 via-green-500 to-green-600 rounded-full shadow-md"
              initial={{ width: 0 }}
              animate={{ width: `${maturityPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-gray-500 dark:text-gray-400">Bond Period</span>
            <span className="text-[9px] text-gray-500 dark:text-gray-400">Q1 Yield</span>
            <span className="text-[9px] text-gray-500 dark:text-gray-400">Maturity</span>
          </div>
        </div>
      </div>

      {/* Garden Visualization - More Compact */}
      <div className="relative bg-gradient-to-b from-green-100 to-amber-100 dark:from-green-900/30 dark:to-amber-900/30 rounded-lg p-4 min-h-[200px] overflow-hidden">
        {/* Ground texture */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)`
          }} />
        </div>

        {/* Trees */}
        <AnimatePresence>
          {trees.map((tree) => (
            <motion.div
              key={tree.id}
              initial={{ opacity: 0, scale: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                y: 0,
                x: `${tree.x}%`,
                y: `${tree.y}%`
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ 
                duration: 0.5,
                delay: parseInt(tree.id.split('-')[1]) * 0.1
              }}
              className="absolute cursor-pointer"
              style={{
                left: `${tree.x}%`,
                top: `${tree.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              onMouseEnter={() => setHoveredTree(tree.id)}
              onMouseLeave={() => setHoveredTree(null)}
              whileHover={{ scale: 1.2, zIndex: 10 }}
            >
              <motion.div
                animate={tree.stage === "cherry" ? {
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.1, 1]
                } : {}}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 1
                }}
                className={`text-4xl ${getTreeColor(tree.stage)}`}
              >
                {getTreeEmoji(tree.stage)}
              </motion.div>

              {/* Progress ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-green-400 opacity-30"
                style={{
                  width: '120%',
                  height: '120%',
                  left: '-10%',
                  top: '-10%'
                }}
                animate={{
                  scale: tree.stage === "cherry" ? [1, 1.2, 1] : 1,
                  opacity: tree.stage === "cherry" ? [0.3, 0.6, 0.3] : 0.3
                }}
                transition={{
                  duration: 2,
                  repeat: tree.stage === "cherry" ? Infinity : 0
                }}
              />

              {/* Tooltip */}
              {hoveredTree === tree.id && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-20"
                >
                  <div className="font-bold">{getStageLabel(tree.stage)}</div>
                  <div className="text-gray-300">Progress: {tree.progress.toFixed(0)}%</div>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Floating particles for mature trees */}
        {trees.filter(t => t.stage === "cherry").map((tree) => (
          <motion.div
            key={`particle-${tree.id}`}
            className="absolute text-xs"
            style={{
              left: `${tree.x}%`,
              top: `${tree.y - 10}%`
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: parseInt(tree.id.split('-')[1]) * 0.2
            }}
          >
            ✨
          </motion.div>
        ))}
      </div>

      {/* Stage Legend - Clear and Simple */}
      <div className="mt-4 bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-lg">📋</span>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
            How Your Investment Grows
          </span>
        </div>
        <div className="text-[10px] text-gray-600 dark:text-gray-400 mb-3 text-center bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <div className="font-semibold mb-1 text-blue-700 dark:text-blue-300">💡 What This Means:</div>
          <div className="text-left space-y-1">
            <div>• <strong>New Investment</strong> → You just invested, waiting for Q1</div>
            <div>• <strong>Growing</strong> → Your trees are growing, approaching first yield</div>
            <div>• <strong>Mature</strong> → Q1 reached! Your first annual returns are now available</div>
            <div>• <strong>Flowering</strong> → Multiple yield cycles completed, returns accruing</div>
            <div>• <strong>Harvest Ready</strong> → Full maturity, maximum returns available</div>
          </div>
          <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800 text-center">
            <strong>Remember:</strong> All investors progress at the same rate. Your investment amount determines how many trees you have, but everyone's trees grow at the same pace!
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {TREE_STAGES.map((stage, idx) => {
            const stageProgress = (idx + 1) * 20;
            const isActive = maturityPercentage >= stageProgress - 20;
            const isCurrent = maturityPercentage >= stageProgress - 20 && maturityPercentage < stageProgress;
            return (
              <div 
                key={stage} 
                className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                  isCurrent 
                    ? 'bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-400 dark:border-amber-600' 
                    : isActive
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <span className={`text-2xl ${isActive ? getTreeColor(stage) : 'text-gray-300 dark:text-gray-600'}`}>
                  {getTreeEmoji(stage)}
                </span>
                <span className={`text-[9px] text-center leading-tight mt-1 font-medium ${
                  isCurrent 
                    ? 'text-amber-700 dark:text-amber-300' 
                    : isActive 
                    ? 'text-gray-700 dark:text-gray-300' 
                    : 'text-gray-400 dark:text-gray-600'
                }`}>
                  {getStageLabel(stage)}
                </span>
                {isCurrent && (
                  <motion.span
                    className="text-[8px] font-bold text-amber-600 dark:text-amber-400 mt-1"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    ← You are here
                  </motion.span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Growth Summary - Compact */}
      <div className="mt-3 bg-gradient-to-r from-green-100 to-amber-100 dark:from-green-900/30 dark:to-amber-900/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Total Returns
          </span>
          <span className="text-sm font-bold text-green-600 dark:text-green-400">
            {cumulativeReturn.toFixed(2)} MBT
          </span>
        </div>
        <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1 text-center">
          {cumulativeReturn > 0 
            ? "🎉 Your garden is producing returns!"
            : "💡 Invest more to grow your garden"}
        </p>
      </div>
    </div>
  )
}

