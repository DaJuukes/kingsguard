const stockfish = require('stockfish')
const engine = stockfish()
let gotUci = false
const startedThinking = false
const position = 'startpos'

const depth = 10 // How far we want to analyze each move

function send (str) {
  console.log('Sending: ' + str)
  engine.postMessage(str)
}

module.exports = {
  randomLegalMove: function (game) {
    const possibleMoves = game.moves()
    const randomIdx = Math.floor(Math.random() * possibleMoves.length)
    return possibleMoves[randomIdx]
  },
  startEngine: async function (game, moveTimes, focusTimes) {
    return new Promise((resolve, reject) => {
      send('uci')

      const engineMoves = []
      let moves = ''
      let bestmove
      let secondbestmove

      let lastline = ''
      engine.onmessage = function (line) {
        console.log('Line: ' + line)

        function startGame () {
        /* Algorithm Steps:
          1: Analyze position at move 0 to depth 10
          2: Get top two engine moves and their cp
          3: Store in array with actual game move
          4: Repeat with next move
        */

          send('setoption name MultiPV value 2')
          send('position startpos moves ' + moves)
          send('go infinite depth ' + depth)
        }

        function receiveMoves (bestmove, secondbestmove) {
          console.log('received moves ' + bestmove.move + ' and ' + secondbestmove.move)
          engineMoves.push([bestmove, secondbestmove])

          if (engineMoves.length === game.history().length) {
            resolve(engineMoves)
          } else {
            const hist = game.history({ verbose: true })[engineMoves.length - 1]

            moves += ' ' + (hist.from + hist.to)

            bestmove = undefined
            secondbestmove = undefined
            lastline = ''

            send('position startpos moves' + moves)
            send('go infinite depth ' + depth)
          }
        }

        if (typeof line !== 'string') {
          console.error('line not string')
        }

        if (!gotUci && line === 'uciok') {
          gotUci = true
          startGame()
        } else if (line.startsWith('info depth ' + depth)) {
          const spl = line.split(' ')
          const cp = spl[9]
          const move = spl[17]
          if (spl[6] === '1') {
            bestmove = { move, cp }
          } else if (spl[6] === '2') {
            secondbestmove = { move, cp }
            if (typeof bestmove !== 'undefined' && typeof secondbestmove !== 'undefined') {
              console.log('Found moves')
              receiveMoves(bestmove, secondbestmove)
            }
          }
        } else if (line.startsWith('bestmove') && lastline.startsWith('info depth')) { // in case of pre-mature search ends
          const spl = lastline.split(' ')
          const cp = spl[9]
          const move = spl[17]
          if (spl[6] === '1') {
            bestmove = { move, cp }
          } else if (spl[6] === '2') {
            secondbestmove = { move, cp }
            if (typeof bestmove !== 'undefined' && typeof secondbestmove !== 'undefined') {
              console.log('Found moves')
              receiveMoves(bestmove, secondbestmove)
            }
          }
        }
        lastline = line
      }
    })
  }
}
