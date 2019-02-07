const WebSocket = require('ws')

const concurrency = 10000
const path = 'ws://localhost:9090'
const message_rate_ms = 1000
const variance = 0.2 //20%

const test_time_ms = 30000

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
  ws.interval_ms  = (variance * Math.random() + 1) * message_rate_ms
  ws.count = 0
  clients.push(ws)

  ws.on('open', () => {
      send(ws)
      const id = setInterval(() => {
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

  setTimeout(() => { 
    ws.end_of_test = true
    clearTimeout(id)
    ws.close()
  }, test_time_ms)
} 
