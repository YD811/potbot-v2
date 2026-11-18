import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { ADMIN_COOKIE, isAdminRequest } from '@/lib/admin-auth'
import { AdminDashboard } from './AdminDashboard'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } }

/**
 * /admin is checked on the server. Without a valid session cookie (set by
 * /api/admin/login) or a Bearer ADMIN_SECRET header it does not exist: 404.
 * With ADMIN_SECRET unset it is always 404.
 */
export default async function AdminPage() {
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value
  const authorization = (await headers()).get('authorization')
  if (!isAdminRequest(cookie, authorization)) notFound()
  return <AdminDashboard />
}
