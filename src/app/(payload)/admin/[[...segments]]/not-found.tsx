import type { ImportMap, SanitizedConfig } from 'payload'
import { NotFoundPage } from '@payloadcms/next/views'
import { importMap } from '../importMap'
import config from '@payload-config'

export { generatePageMetadata as generateMetadata } from '@payloadcms/next/views'

type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] }>
}

const NotFound = async ({ params, searchParams }: Args) => {
  return <NotFoundPage config={config} importMap={importMap} params={params} searchParams={searchParams} />
}

export default NotFound
