const stockfish = require('stockfish')
const engine = stockfish()
const gotUci = false

const depth = 15 // How far we want to analyze each move

function send (str) {
  console.log('Sending: ' + str)
  engine.postMessage(str)
}

engine.onmessage = function (line) { console.log('Line: ' + line) } // temp
send('uci')

module.exports = {
  randomLegalMove: function (game) {
    const possibleMoves = game.moves()
    const randomIdx = Math.floor(Math.random() * possibleMoves.length)
    return possibleMoves[randomIdx]
  },
  startEngine: async function (game) {
    return new Promise((resolve, reject) => {
      let done = false
      let started
      const engineMoves = []
      let moves = ''
      let bestmove
      let lastline = ''

      send('ucinewgame')
      send('isready')

      engine.onmessage = function (line) {
        if (done) return
        console.log('Line: ' + line)

        function startGame () {
        /* Algorithm Steps:
          1: Analyze position at move 0 to depth 10
          2: Get top two engine moves and their cp
          3: Store in array with actual game move
          4: Repeat with next move
        */
          started = true
          send('position startpos moves ' + moves)
          send('go depth ' + depth)
        }

        function receiveMoves () {
          send('isready')
        }
        function addMove () {
          console.log('received moves ' + bestmove.move)

          if (engineMoves.length % 2 === 0) engineMoves.push(bestmove)
          else {
            if (bestmove.cp.startsWith('-')) engineMoves.push({ move: bestmove.move, cp: bestmove.cp.slice(1, bestmove.cp.length - 1) })
            else engineMoves.push({ move: bestmove.move, cp: '-' + bestmove.cp })
          }

          if (engineMoves.length === game.history().length) {
            done = true
            resolve(engineMoves)
          } else if (engineMoves.length <= game.history().length) {
            const hist = game.history({ verbose: true })[engineMoves.length - 1]

            try {
              moves += ' ' + (hist.from + hist.to)
            } catch (e) {
              moves += ' ' + ('errmove')
              console.error(e)
              console.log(game.history({ verbose: true }), game.history({ verbose: true }).length)
              console.log(engineMoves, engineMoves.length)
              process.exit(0)
            }
            bestmove = undefined
            lastline = ''

            send('position startpos moves' + moves)
            send('go depth ' + depth)
          }
        }

        if (typeof line !== 'string') {
          console.error('line not string: ' + line)
        }

        if (line === 'readyok') {
          // Engine ready for new move, call receivemvoes
          if (started) addMove()
          else startGame()
        } /* else if (line.startsWith('info depth ' + depth)) {
          const lineA = line.split(' ')
          let cp = lineA[lineA.indexOf('cp') + 1]
          if (lineA.indexOf('mate') > -1) {
            cp = 'M' + lineA[lineA.indexOf('mate') + 1]
          }
          const move = lineA[lineA.indexOf('time') + 3]
          bestmove = { move, cp }
          console.log('Found moves')
          receiveMoves()
        } */else if (line.startsWith('bestmove')) { // in case of pre-mature search ends
          const lineA = lastline.split(' ')
          let cp = lineA[lineA.indexOf('cp') + 1]
          let move = lineA[lineA.indexOf('time') + 3]
          if (lineA.indexOf('mate') > -1) {
            cp = 'M' + lineA[lineA.indexOf('mate') + 1]
          } else if (!cp) {
            console.log('default cp')
            cp = '500'
            move = line.split(' ')[1]
          }

          bestmove = { move, cp }
          console.log('Found moves')
          receiveMoves()
        }
        if (line.startsWith('info depth')) lastline = line
      }
    })
  },
  analyzeGame: function (game, moveTimes, focusTimes) {

  }
}
