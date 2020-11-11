const stockfish = require('stockfish')
const engine = stockfish()

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
  analyzeGame: function (moves, moveTimes, focusTimes) {
    /*
    Cheat Detection Algorithm

    Score from 0 (cheating very unlikely) to 100 (cheating extremely likely) for each side
    Give less weight to first 5 moves, as they are book moves

    Compare timestamps -- if stdev < 5 seconds, sus
    Calculate total centipawn loss

    Per move:
      - If move = engine move, add 30 (unless cp > 500, then ignore as the crushing move might be obvious)
      - If low centipawn loss (<150) and any unfocus time, flag

      */

    const white = {
      finalMoves: [],
      averageTime: 0,
      averageFocus: 0,
      timeStdev: 0,
      focusStdev: 0,
      averageCpl: 0
    }
    const black = {
      finalMoves: [],
      averageTime: 0,
      averageFocus: 0,
      timeStdev: 0,
      focusStdev: 0,
      averageCpl: 0
    }

    let whiteTimeTemp = 0
    let blackTimeTemp = 0

    let whiteFocusTemp = 0
    let blackFocusTemp = 0

    let whiteCplTemp = 0
    let blackCplTemp = 0

    // Loop through arrays, condense to one array, and add up totals for averaging
    for (let i = 0; i < moves.length; i++) {
      const x = moves[i]
      x.moveTime = parseInt(moveTimes[i])
      x.focusTime = parseInt(focusTimes[i])
      x.suspicion = 0

      if (moves[i + 1]) {
        let cpi = parseInt(x.cp)
        let cpi2 = parseInt(moves[i + 1].cp)

        if (isNaN(cpi)) {
          // Mate, assign arbitrarily high number instead
          if (x.cp.startsWith('-')) cpi = -2000
          else cpi = 2000
        }
        if (isNaN(cpi2)) {
          // Mate, assign arbitrarily high number instead
          if (moves[i + 1].cp.startsWith('-')) cpi2 = -2000
          else cpi2 = 2000
        }

        if (i % 2 === 0) x.cpl = (cpi - cpi2) // [current centipawn value - move chosen's centipawn value] = centipawn loss
        else x.cpl = (cpi2 - cpi) // black's is reversed

        if (x.focusTime > 0 && (x.move === x.enginemove || x.cpl < 150)) {
          x.suspicion += 40
        }
        if (x.move === x.enginemove && cpi2 < 500) {
          x.cpl = 0
          x.suspicion += 30
        }
      } else {
        // last move can be pretty much ignored
        x.cpl = 0
      }

      if (i % 2 === 0) {
        white.finalMoves.push(x)
        whiteTimeTemp += x.moveTime
        whiteFocusTemp += x.focusTime
        whiteCplTemp += x.cpl
      } else {
        black.finalMoves.push(x)
        blackTimeTemp += x.moveTime
        blackFocusTemp += x.focusTime
        blackCplTemp += x.cpl
      }
    }

    // Calculate average
    white.averageTime = Math.floor(whiteTimeTemp / white.finalMoves.length)
    black.averageTime = Math.floor(blackTimeTemp / black.finalMoves.length)

    white.averageFocus = Math.floor(whiteFocusTemp / white.finalMoves.length)
    black.averageFocus = Math.floor(blackFocusTemp / black.finalMoves.length)

    white.averageCpl = Math.floor(whiteCplTemp / white.finalMoves.length)
    black.averageCpl = Math.floor(blackCplTemp / black.finalMoves.length)

    // Calculate standard deviation
    whiteTimeTemp = 0 // Re-use
    blackTimeTemp = 0

    whiteFocusTemp = 0
    blackFocusTemp = 0

    // Need two different loops because they might be different lengths
    for (let i = 0; i < white.finalMoves.length; i++) {
      whiteTimeTemp += Math.pow((white.finalMoves[i].moveTime - white.averageTime), 2) // stdev = sqrt(sigma(x_i - u)^2 / N)
      whiteFocusTemp += Math.pow((white.finalMoves[i].focusTime - white.averageFocus), 2)
    }
    for (let i = 0; i < black.finalMoves.length; i++) {
      blackTimeTemp += Math.pow((black.finalMoves[i].moveTime - black.averageTime), 2) // stdev = sqrt(sigma(x_i - u)^2 / N)
      blackFocusTemp += Math.pow((black.finalMoves[i].focusTime - black.averageFocus), 2)
    }

    white.timeStdev = Math.floor(Math.sqrt(whiteTimeTemp / white.finalMoves.length))
    white.focusStdev = Math.floor(Math.sqrt(whiteFocusTemp / white.finalMoves.length))

    black.timeStdev = Math.floor(Math.sqrt(blackTimeTemp / black.finalMoves.length))
    black.focusStdev = Math.floor(Math.sqrt(blackFocusTemp / black.finalMoves.length))

    /* Done collecting data, time to analyze */
    return ({ white, black })
  }
}
