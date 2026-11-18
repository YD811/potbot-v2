import { redirect } from 'next/navigation'

/** The BAG cabinet now lives inside the main dashboard. Old links keep working. */
export default function BagMePage() {
  redirect('/dashboard#bag')
}
