'use client'

import React, { useState, forwardRef } from 'react'
import InputField from './InputField'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordFieldProps {
  label: string
  id: string
  error?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  autoComplete?: string
}

const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, id, error, ...props }, ref) => {
    const [show, setShow] = useState(false)

    return (
      <InputField
        ref={ref}
        id={id}
        label={label}
        type={show ? 'text' : 'password'}
        error={error}
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        }
        rightIcon={
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            className="cursor-pointer text-gray-400 hover:text-gray-600 transition"
            tabIndex={-1}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        {...props}
      />
    )
  }
)
PasswordField.displayName = 'PasswordField'
export default PasswordField
