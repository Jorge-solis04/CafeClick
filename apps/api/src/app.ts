import express from 'express'

export const app = express()

app.disable('x-powered-by')

app.get('/', (_request, response) => {
  response.json({ message: 'CaféClick API is running' })
})
