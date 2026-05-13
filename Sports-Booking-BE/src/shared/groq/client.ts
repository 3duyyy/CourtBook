import Groq from 'groq-sdk'
import { env } from '../../config/env.config'

export const groq = new Groq({ apiKey: env.GROQ_API_KEY! })
