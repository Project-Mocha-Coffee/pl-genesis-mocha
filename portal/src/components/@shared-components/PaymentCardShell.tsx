import React from "react";

interface PaymentCardShellProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function PaymentCardShell({
  title,
  subtitle,
  icon,
  headerRight,
  className = "",
  contentClassName = "",
  children,
}: PaymentCardShellProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800/95 rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-700 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] ${className}`}
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-start gap-2.5 min-w-0">
          {icon ? <div className="shrink-0 text-lg mt-0.5">{icon}</div> : null}
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-[#522912] dark:text-amber-400 tracking-tight truncate">
              {title}
            </h3>
            {subtitle ? (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>

      <div className={`px-5 pb-5 pt-4 sm:px-6 sm:pb-6 ${contentClassName}`}>{children}</div>
    </div>
  );
}

