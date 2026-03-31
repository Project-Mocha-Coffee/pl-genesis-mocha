import React from 'react';
import { Coffee, DollarSign, TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';

type IconName = 'Coffee' | 'DollarSign' | 'TrendingUp';

interface StatCardProps {
  title: string;
  value: string | number;
  isLoading?: boolean;
  iconColor?: 'green' | 'red' | 'yellow';
  icon?: IconName;
  compact?: boolean;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  footerLine1?: string;
  footerLine2?: string;
  footerIcon?: React.ReactNode;
  id?: string; 
}

const formatValue = (val: string | number): string => {
  if (typeof val === 'number') {
    return Number(val).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    });
  }
  return val;
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  isLoading = false,
  iconColor = 'green',
  icon = 'Coffee',
  compact = false,
  trend,
  footerLine1,
  footerLine2,
  footerIcon,
  id, 
}) => {
  const colorStyles: Record<
    NonNullable<StatCardProps['iconColor']>,
    { iconBg: string; iconColor: string; badge: string }
  > = {
    green: {
      iconBg: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-400',
      badge: 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
    },
    red: {
      iconBg: 'bg-red-100 dark:bg-red-900',
      iconColor: 'text-red-600 dark:text-red-400',
      badge: 'border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
    },
    yellow: {
      iconBg: 'bg-yellow-100 dark:bg-yellow-900',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      badge: 'border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
    },
  };

  const selectedStyle = colorStyles[iconColor];

  const icons: Record<IconName, LucideIcon> = {
    Coffee,
    DollarSign,
    TrendingUp,
  };

  const IconComponent = icons[icon];

  return (
    <motion.div
      id={id} // <-- Assign the id to the root div
      className={`
        border dark:border-gray-800 rounded-lg 
        ${compact ? 'p-2' : 'p-4'} 
        bg-white dark:bg-gray-800
        w-full h-full relative overflow-hidden
      `}
      whileHover={{ 
        scale: 1.02,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        transition: { duration: 0.2 }
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 opacity-5"
        animate={{
          background: [
            `radial-gradient(circle at 0% 0%, ${iconColor === 'green' ? '#10b981' : iconColor === 'red' ? '#ef4444' : '#f59e0b'} 0%, transparent 50%)`,
            `radial-gradient(circle at 100% 100%, ${iconColor === 'green' ? '#10b981' : iconColor === 'red' ? '#ef4444' : '#f59e0b'} 0%, transparent 50%)`,
            `radial-gradient(circle at 0% 0%, ${iconColor === 'green' ? '#10b981' : iconColor === 'red' ? '#ef4444' : '#f59e0b'} 0%, transparent 50%)`,
          ]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {/* Trend badge in top right corner */}
      {trend && (
        <motion.div 
          className={`absolute top-3 right-3 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${selectedStyle.badge}`}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        >
          <motion.div
            animate={{ y: trend.isPositive ? [-1, 1, -1] : [1, -1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
          </motion.div>
          {trend.value}
        </motion.div>
      )}

      {/* Header section */}
      <div className="mb-4 relative z-10">
        <motion.div 
          className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {title}
        </motion.div>
        <motion.div 
          className={`
            ${compact ? 'text-xl' : 'text-2xl font-semibold tabular-nums'} 
            text-gray-900 dark:text-white
          `}
          key={value} // Re-animate when value changes
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          {isLoading ? (
            <motion.span 
              className="text-gray-400 dark:text-gray-500"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ...
            </motion.span>
          ) : (
            formatValue(value)
          )}
        </motion.div>
      </div>

      {/* Footer section - optional */}
      {(footerLine1 || footerLine2) && (
        <div className="flex flex-col items-start gap-1.5 text-sm pt-4">
          {footerLine1 && (
            <div className="line-clamp-1 flex gap-2 font-medium text-gray-900 dark:text-white">
              {footerLine1} {footerIcon}
            </div>
          )}
          {footerLine2 && (
            <div className="text-gray-500 dark:text-gray-400">
              {footerLine2}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default StatCard;
