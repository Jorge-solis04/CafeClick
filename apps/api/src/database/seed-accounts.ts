import { seedDemoAccounts, type DemoAccount } from './seeds.js'

const minimumPasswordLength = 8
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed demo accounts')
}

function requiredPassword(variableName: string) {
  const password = process.env[variableName]

  if (!password || password.length < minimumPasswordLength) {
    throw new Error(`${variableName} must contain at least ${minimumPasswordLength} characters`)
  }

  return password
}

const accounts: DemoAccount[] = [
  {
    email: process.env.DEMO_CUSTOMER_EMAIL ?? 'cliente@cafeclick.test',
    password: requiredPassword('DEMO_CUSTOMER_PASSWORD'),
    role: 'customer',
  },
  {
    email: process.env.DEMO_KITCHEN_EMAIL ?? 'cocina@cafeclick.test',
    password: requiredPassword('DEMO_KITCHEN_PASSWORD'),
    role: 'kitchen',
  },
]

await seedDemoAccounts(connectionString, accounts)
console.log(`Demo accounts ready: ${accounts.map((account) => `${account.email} (${account.role})`).join(', ')}`)
