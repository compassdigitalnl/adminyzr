import configPromise from '@payload-config'
import { getPayload } from 'payload'

export const getPayloadClient = () => getPayload({ config: configPromise })
