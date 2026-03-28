import { getProject } from '@/lib/actions/projects'
import { ProjectDetailClient } from './ProjectDetailClient'

type Props = { params: Promise<{ id: string; locale: string }> }

export default async function ProjectDetailPage({ params }: Props) {
  const { id, locale } = await params
  let project: Record<string, unknown> | null = null
  try { project = await getProject(id) as Record<string, unknown> } catch { /* */ }
  if (!project) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Project niet gevonden.</p></div>
  return <ProjectDetailClient project={project} locale={locale} />
}
