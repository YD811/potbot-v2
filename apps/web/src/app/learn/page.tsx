import { redirect } from 'next/navigation'

// /learn has been replaced by the structured documentation at /docs.
// Keep this route as a permanent redirect so old links keep working.
export default function LearnRedirect() {
  redirect('/docs')
}
