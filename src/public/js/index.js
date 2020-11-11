let board = null
const game = new Chess()
const $maindiv = $('#main-div')
const $status = $('#status')
const $statuses = $('#statuses')
const $fen = $('#fen')
const $pgn = $('#pgn')
const $submit = $('#submit')
const $load = $('#load')
const $reset = $('#reset')
const $results = $('#results')
const $whiteResults = $('#whiteResults')
const $blackResults = $('#blackResults')
const $myboardiv = $('#myBoard')

// Websocket interactions
// const webSocket = new WebSocket('ws://localhost:3000')

// Focus tracker
let outOfFocus = 0
let focusBasket = 0
let focusTimes = []

// Timestamps
let moveStart = Date.now()

let timestamps = []

const config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
}
board = Chessboard('myBoard', config)

updateStatus()

$submit.click(function () {
  // We can assume finalpgn and timestamps are populated from the websocket function
  $statuses.hide()
  $submit.hide()
  $load.show()
  $.get('/analyze', { pgn: game.pgn(), moveTimes: timestamps, focusTimes: focusTimes }, function (data) {
    console.log(data)
    $load.hide()

    let wL = `<h1>White Results</h1>
    Avg CPL: ${data.white.averageCpl}
    <br /> Avg Time Spent: ${data.white.averageTime}
    <br /> Avg Unfocus Time: ${data.white.averageFocus}
    
    <br /> Time Spent StDev: ${data.white.timeStdev}
    <br /> Unfocus time StDev: ${data.white.focusStdev}
    <br />
    <br /> <h3>Full move list:</h3>`

    for (let i = 0; i < data.white.finalMoves.length; i++) {
      const move = data.white.finalMoves[i]
      wL += `${move.move} {Engine: ${move.enginemove}, CPL: ${move.cpl}, Time: ${move.moveTime}, Focus Time: ${move.focusTime}, Suspicion: ${move.suspicion}%} <br />`
    }

    let bL = `<h1>Black Results</h1>
    Avg CPL: ${data.black.averageCpl}
    <br /> Avg Time Spent: ${data.black.averageTime}
    <br /> Avg Unfocus Time: ${data.black.averageFocus}

    <br /> Time Spent StDev: ${data.black.timeStdev}
    <br /> Unfocus time StDev: ${data.black.focusStdev}
    <br />
    <br /> <h3>Full move list:</h3>`

    for (let i = 0; i < data.black.finalMoves.length; i++) {
      const move = data.black.finalMoves[i]
      bL += `${move.move} {Engine: ${move.enginemove}, CPL: ${move.cpl}, Time: ${move.moveTime}, Focus Time: ${move.focusTime}, Suspicion: ${move.suspicion}%}<br />`
    }

    $maindiv.addClass('main-div-results').removeClass('main-div')
    $results.addClass('results-div').removeClass('results-div-hidden')

    board.resize()

    $whiteResults.html(wL)
    $blackResults.html(bL)
  })
})

$reset.click(function () {
  console.log('Resetting...')

  $pgn.html('')
  $pgn.show()

  $fen.html('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1  ')
  $fen.show()

  $load.hide()

  $status.html('White to move')

  $statuses.show()

  $blackResults.html('')
  $whiteResults.html('')
  $maindiv.addClass('main-div').removeClass('main-div-results')
  $results.addClass('results-div-hidden').removeClass('results-div')

  $submit.removeClass('button').addClass('button-hidden')

  timestamps = []
  focusBasket = 0
  outOfFocus = 0
  focusTimes = []

  moveStart = Date.now()

  game.reset()
  board.position(game.fen())
  board.resize()
})

function onDragStart (source, piece, position, orientation) {
  // do not pick up pieces if the game is over
  if (game.game_over()) return false

  // only pick up pieces for the White side
  /* if (game.turn() === 'b') {
    return false
  } */
}

function onDrop (source, target) {
  // see if the move is legal
  const move = game.move({
    from: source,
    to: target,
    promotion: 'q' // NOTE: always promote to a queen for example simplicity
  })

  // illegal move
  if (move === null) return 'snapback'

  // webSocket.send(game.history()[game.history().length - 1])
  timestamps.push(Date.now() - moveStart)
  moveStart = Date.now()

  updateStatus()
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd () {
  board.position(game.fen())
}

function updateStatus () {
  let status = ''
  focusTimes.push(focusBasket)
  focusBasket = 0

  let moveColor = 'White'
  if (game.turn() === 'b') {
    moveColor = 'Black'
  }

  if (game.in_checkmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.'
    endGame()
  } else if (game.in_draw()) {
    status = 'Game over, drawn position'
    endGame()
  } else if (game.game_over()) {
    status = 'Game over due to repetition, resignation, etc'
    endGame()
  } else {
    status = moveColor + ' to move'

    // check?
    if (game.in_check()) {
      status += ', ' + moveColor + ' is in check'
    }
  }

  $status.html(status)
  $fen.html(game.fen())
  $pgn.html(game.pgn())
}

function endGame () {
  console.log('Game over.')
  $submit.removeClass('button-hidden').addClass('button')
}

function visibilityChange () {
  if (document.visibilityState === 'hidden') {
    // Track total time hidden in current move
    outOfFocus = Date.now()
  } else if (document.visibilityState === 'visible') {
    focusBasket += (Date.now() - outOfFocus)
  }
}

document.addEventListener('visibilitychange', visibilityChange)

$(window).resize(board.resize)
