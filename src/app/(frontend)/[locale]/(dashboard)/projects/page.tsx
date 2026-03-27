import { getTranslations } from 'next-intl/server'
import { getProjects } from '@/lib/actions/projects'
import { getClients } from '@/lib/actions/clients'
import { ProjectsPageClient } from './ProjectsPageClient'

type Props = {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}

export default async function ProjectsPage({ searchParams }: Props) {
  const params = await searchParams
  const t = await getTranslations('projects')

  let data
  try {
    data = await getProjects({
      search: params.search,
      status: params.status,
      page: params.page ? parseInt(params.page) : 1,
    })
  } catch {
    data = { docs: [], totalDocs: 0, totalPages: 0, page: 1, hasNextPage: false, hasPrevPage: false }
  }

  let clients: Array<Record<string, unknown> & { id: string }> = []
  try {
    const clientsData = await getClients({ limit: 100 })
    clients = clientsData.docs
  } catch {
    clients = []
  }

  return (
    <ProjectsPageClient
      initialData={data}
      clients={clients}
      initialSearch={params.search || ''}
      initialStatus={params.status || 'all'}
      translations={{
        title: t('title'),
        newProject: t('newProject'),
        noProjects: t('noProjects'),
        filter: t('filter'),
      }}
    />
  )
}
