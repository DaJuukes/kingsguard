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
  chessGame.currTime = Date.now()
  chessGame.moveTimestamps = [] // [w1,b1,w2,b2]
  socket.on('message', message => {
    //Process move
    chessGame.move(message); // TODO add illegal move checking
    chessGame.moveTimestamps.push(Date.now() - chessGame.currTime)
    chessGame.currTime = Date.now()

    if (chessGame.in_checkmate() || chessGame.in_draw()) {
      console.log('Game complete, sending full PGN')

      socket.send(JSON.stringify(chessGame.moveTimestamps))
    } else {

    let move = chessUtil.randomLegalMove(chessGame);

    chessGame.move(move)
    chessGame.moveTimestamps.push(Date.now() - chessGame.currTime)
    chessGame.currTime = Date.now()
    socket.send(move)

    }
    })

})

server.on('upgrade', (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, socket => {
    wsServer.emit('connection', socket, request)
  })
})
