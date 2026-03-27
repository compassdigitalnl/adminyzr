import { getPayload } from 'payload'
import config from '@payload-config'

async function main() {
  console.log('Initializing Payload to push schema...')
  const payload = await getPayload({ config })
  console.log('Payload initialized — schema pushed to database.')

  // Verify new collections
  const collections = ['projects', 'api-keys', 'subscriptions', 'employees', 'leave-requests', 'payroll-runs', 'payroll-entries', 'orders']
  for (const col of collections) {
    try {
      const result = await payload.find({ collection: col as any, limit: 0 })
      console.log(`  ✓ ${col} (${result.totalDocs} docs)`)
    } catch (e: any) {
      console.log(`  ✗ ${col}: ${e.message}`)
    }
  }

  process.exit(0)
}
main()
