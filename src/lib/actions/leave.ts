'use server'

import { getPayloadClient } from '@/lib/get-payload'
import { revalidatePath } from 'next/cache'

export async function updateLeaveStatus(id: string, status: string) {
  const payload = await getPayloadClient()

  await payload.update({
    collection: 'leave-requests',
    id,
    data: {
      status,
      ...(status === 'approved' ? { approvedAt: new Date().toISOString() } : {}),
    },
    overrideAccess: true,
  })

  revalidatePath('/[locale]/leave', 'page')
  return { success: true }
}
