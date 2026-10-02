import AdminView from '@/app/AdminView'
import { VIEW_IDS } from '@/shared/lib/routes'

// Static export: one HTML file per section, and anything else is a 404.
export const dynamicParams = false

export function generateStaticParams() {
  return VIEW_IDS.filter(id => id !== 'overview').map(view => ({ view }))
}

export default async function SectionPage({ params }) {
  const { view } = await params
  return <AdminView id={view} />
}
