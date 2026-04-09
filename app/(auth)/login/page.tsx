import { Suspense } from 'react'
import SplitLayout from '@/components/auth/SplitLayout'
import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <SplitLayout>
      <Suspense>
        <LoginForm />
      </Suspense>
    </SplitLayout>
  )
}
