import 'reflect-metadata'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.config'

const app = express()
app.use(compression())
app.use(cors())
app.use(helmet())
app.use(express.json())
app.use(cookieParser())
app.use(morgan('dev'))

app.listen(env.PORT, () => {
  console.log(`Server run on Port: ${env.PORT}`)
})
