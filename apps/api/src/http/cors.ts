import cors from 'cors'

export function createApiCors(webOrigin: string) {
  return cors({
    origin: [new URL(webOrigin).origin],
    methods: ['GET', 'HEAD', 'POST', 'PATCH'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  })
}
