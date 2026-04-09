import { Suspense } from 'react'
import SplitLayout from '@/components/auth/SplitLayout'
import RegisterForm from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <SplitLayout>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </SplitLayout>
  )
}
