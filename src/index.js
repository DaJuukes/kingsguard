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
const server = app.listen(process.env.PORT, () => { console.log('Server established on port ' + process.env.PORT) })

app.get('/', function (req, res) {
  res.sendFile('./index.html', { root: __dirname })
})

app.get('/analyze', function (req, res) {
  // Engine analysis, consider long loading
  const { pgn, moveTimes, focusTimes } = req.query
  console.log(moveTimes, focusTimes)
  const game = new Chess()
  game.load_pgn(pgn)

  chessUtil.startEngine(game).then(moves => {
    const nMoves = []
    const hist = game.history({ verbose: true })
    for (let i = 0; i < hist.length; i++) {
      nMoves.push({ move: hist[i].from + hist[i].to, enginemove: moves[i].move, cp: moves[i].cp })
    }

    const data = chessUtil.analyzeGame(nMoves, moveTimes, focusTimes)
    res.send(data)
    console.log('Sent data back.')
    res.end()
  })
})
