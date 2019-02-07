const WebSocket = require('ws')

const concurrency = parseInt(process.argv[2],10)
const path = 'ws://localhost:9090'
const message_rate_ms = 300
const variance = 0.2 //20%
const test_time_ms = 10000

let gid = 0
const outstanding_reqs = new Map()

function send(ws) {
      data = `${gid}`
      gid++
      try {
        outstanding_reqs.set(data, ws.id)
        ws.send(data, (e) => { if(e) console.error(e) })
      } catch(e) {
        console.error(e)
      }
}

let close_count = 0

clients = []

for(let i = 0; i < concurrency; ++i) {
  const ws = new WebSocket(path)
  ws.id = i
  ws.end_of_test = false
  ws.interval_ms  = (variance * Math.random()) * message_rate_ms + message_rate_ms*(1-variance/2)
  ws.count = 0
  clients.push(ws)

  ws.on('open', () => {
      send(ws)
      ws.timeout_id = setInterval(() => {
        send(ws)
      }, ws.interval_ms)

  })

  ws.on('message', (data) => {
    const id = outstanding_reqs.get(data)
    ws.count++
    outstanding_reqs.delete(data)
  })

  ws.on('close', () => {
    if(!ws.end_of_test) {
      console.error('unexpected connection closed', ws.id)
    }
    close_count++
    if(close_count === concurrency) {
      for (let [key, value] of outstanding_reqs.entries()) console.log('unacked msgid', key, 'id', value)

      let total = 0
      console.log('totals per client:')
      clients.forEach((client) => {
        console.log(`- ${client.id} rts: ${client.count} interval: ${client.interval_ms}`)
        total += client.count
      })
      console.log(`grand total ${total}`)
      
    }
  })

  ws.on('error', (err) => {
    if(ws.end_of_test) {
      return
    }
    ws.end_of_test = true
    clearTimeout(ws.timeout_id)
    console.log(`${ws.id} failed with error: ${error}`)
  })

  setTimeout(() => { 
    if(ws.end_of_test) {
      return
    }
    ws.end_of_test = true
    clearTimeout(ws.timeout_id)
    ws.close()
  }, test_time_ms)
} 
