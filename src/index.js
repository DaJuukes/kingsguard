// Requirements
const express = require('express')
const cors = require('cors')
const ws = require('ws')

require('dotenv').config({ path: './env/.env' })

// Initialize webserver
const app = express()
app.use(cors())
app.use(express.static('./public'))
const server = app.listen(process.env.PORT, onServerLoad)

// Initialize websocket
const wsServer = new ws.Server({ noServer: true })
wsServer.on('connection', socket => {
  socket.on('message', message => console.log(message))
})

server.on('upgrade', (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, socket => {
    wsServer.emit('connection', socket, request)
  })
})

function onServerLoad() {
  console.log("Server established on port " + process.env.PORT)
}