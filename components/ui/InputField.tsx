'use client'

import React, { forwardRef } from 'react'

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon: React.ReactNode
  rightIcon?: React.ReactNode
  error?: string
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, icon, rightIcon, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-3 text-gray-400 pointer-events-none">
            {icon}
          </span>
          <input
            id={id}
            ref={ref}
            className={[
              'w-full rounded-lg border bg-white py-2.5 pl-10 text-sm text-gray-800 outline-none transition placeholder:text-gray-400',
              rightIcon ? 'pr-10' : 'pr-3',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                : 'border-gray-300 focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]',
            ].join(' ')}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 text-gray-400">{rightIcon}</span>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
InputField.displayName = 'InputField'
export default InputField
