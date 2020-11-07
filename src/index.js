// Requirements
const express = require('express')
const cors = require('cors')
const ws = require('ws')
const { Chess } = require('chess.js')
const chessUtil = require('./chessUtil.js')

require('dotenv').config({ path: './env/.env' })

// Initialize webserver
const app = express()
app.use(cors())
app.use(express.static('./public'))
const server = app.listen(process.env.PORT, () => { console.log("Server established on port " + process.env.PORT) })

// Initialize websocket
const wsServer = new ws.Server({ noServer: true })
wsServer.on('connection', socket => {

  let chessGame = new Chess()
  
  socket.on('message', message => {
    //Process move

    chessGame.move(message); // TODO add illegal move checking

    let move = chessUtil.randomLegalMove(chessGame);

    chessGame.move(move)

    socket.send(move)
    })

})

server.on('upgrade', (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, socket => {
    wsServer.emit('connection', socket, request)
  })
})
