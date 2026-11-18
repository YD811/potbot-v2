import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { adminConfigured } from '@/lib/admin-auth'
import { AdminLoginForm } from './AdminLoginForm'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin sign in', robots: { index: false, follow: false } }

export default function AdminLoginPage() {
  if (!adminConfigured()) notFound()
  return <AdminLoginForm />
}
