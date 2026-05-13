import { PayOS } from '@payos/node'
import { env } from '../../config/env.config'

const payos = new PayOS({
  clientId: env.PAYOS_CLIENT_ID!,
  apiKey: env.PAYOS_API_KEY!,
  checksumKey: env.PAYOS_CHECKSUM_KEY!
})

export { payos }
