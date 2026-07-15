// Local stand-in for Vercel's serverless runtime so `npm run dev` can serve
// the api/ functions. Vite proxies /api/* here (see vite.config.js).
// Production still uses Vercel's own runtime — this file is dev-only.
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// load .env the way Vercel injects env vars (skip vars already set)
for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim()
}

const routes = {
  '/api/paynow-initiate': (await import('../api/paynow-initiate.js')).default,
  '/api/paynow-poll': (await import('../api/paynow-poll.js')).default,
  '/api/paynow-result': (await import('../api/paynow-result.js')).default,
}

const PORT = 3001

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const handler = routes[url.pathname]
  if (!handler) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  // collect and parse the body like Vercel does
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  const contentType = req.headers['content-type'] ?? ''
  let body = raw
  if (contentType.includes('application/json') && raw) {
    try { body = JSON.parse(raw) } catch { body = raw }
  } else if (contentType.includes('application/x-www-form-urlencoded') && raw) {
    body = Object.fromEntries(new URLSearchParams(raw))
  }

  // Vercel-style req/res helpers
  const vercelReq = {
    method: req.method,
    headers: req.headers,
    query: Object.fromEntries(url.searchParams),
    body,
  }
  const vercelRes = {
    statusCode: 200,
    setHeader: (k, v) => res.setHeader(k, v),
    status(code) { this.statusCode = code; return this },
    json(obj) {
      res.writeHead(this.statusCode, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(obj))
      return this
    },
    send(text) {
      res.writeHead(this.statusCode, { 'Content-Type': 'text/plain' })
      res.end(String(text))
      return this
    },
  }

  try {
    await handler(vercelReq, vercelRes)
  } catch (err) {
    console.error(`[dev-api] ${url.pathname} crashed:`, err)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal server error' }))
    }
  }
})
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      // another dev-api instance already owns the port — reuse it instead
      // of crashing (exit 0 so `concurrently -k` doesn't kill vite too)
      console.log(`[dev-api] port ${PORT} already in use — reusing the running instance`)
      process.exit(0)
    }
    throw err
  })
  .listen(PORT, () => {
    console.log(`[dev-api] serving api/ functions on http://localhost:${PORT}`)
  })
