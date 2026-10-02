'use client'
import { Suspense } from 'react'
import '@/app/admin.css'
import { AdminProvider, useAdmin } from './AdminContext'
import LoginScreen from './LoginScreen'
import AdminShell from './AdminShell'
import CrashGuard from './CrashGuard'

function Gate({ children }) {
  const { ready, user } = useAdmin()

  // Avoid a flash of the login screen while the stored session resolves.
  if (!ready) return <div className="ad-boot">Loading dashboard…</div>

  // Signing in keeps the current URL, so a deep link survives the login step.
  return user ? <AdminShell>{children}</AdminShell> : <LoginScreen />
}

/**
 * Lives in the root layout, so the provider (and every list it has loaded)
 * survives moving between sections — only the routed page underneath changes.
 */
export default function AdminApp({ children }) {
  return (
    <CrashGuard>
      <AdminProvider>
        {/* useSearchParams needs a Suspense boundary under static export. */}
        <Suspense fallback={<div className="ad-boot">Loading dashboard…</div>}>
          <Gate>{children}</Gate>
        </Suspense>
      </AdminProvider>
    </CrashGuard>
  )
}
