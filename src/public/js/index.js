let board = null
const game = new Chess()
const $status = $('#status')
const $statuses = $('#statuses')
const $fen = $('#fen')
const $pgn = $('#pgn')
const $finalpgn = $('#finalpgn')
const $submit = $('#submit')
const $load = $('#load')
const $reset = $('#reset')
const $results = $('#results')
const $whiteResults = $('#whiteResults')
const $blackResults = $('#blackResults')

// Websocket interactions
// const webSocket = new WebSocket('ws://localhost:3000')

// Focus tracker
let outOfFocus = 0
let focusBasket = 0
let focusTimes = []

// Timestamps
let moveStart = Date.now()

const finalpgn = ''
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
/*
webSocket.onopen = function (event) {
  console.log('Connected')
}

webSocket.onmessage = function (event) {
  console.log('WebSocket message received:', event.data)

  if (event.data.startsWith('[')) {
    game.focusTimes.shift()
    timestamps = JSON.parse(event.data)
    for (let i = 0; i < game.history().length; i += 2) {
      finalpgn += game.history()[i] + ' {' + timestamps[i] + 'ms, unfocused ' + game.focusTimes[i] + 'ms}'
      if (game.history()[i + 1]) {
        finalpgn += '  ' + game.history()[i + 1] + ' {' + timestamps[i + 1] + 'ms, unfocused ' + game.focusTimes[i + 1] + 'ms} <br />'
      } else finalpgn += '<br />'
    }
    $pgn.html(finalpgn)
  } // end of game timestamps
  else {
    // game.move(event.data)
    // updateStatus()
  }
}

webSocket.onclose = function (event) {
  console.log('WebSocket closed.')
} */

$submit.click(function () {
  // We can assume finalpgn and timestamps are populated from the websocket function
  $statuses.hide()
  $submit.hide()
  $load.show()
  $.get('/analyze', { pgn: game.pgn(), moveTimes: timestamps, focusTimes: focusTimes }, function (data) {
    console.log(data)
    $load.hide()

    let wL = `<h3>White Results</h3>
    Avg CPL: ${data.white.averageCpl}
    <br /> Avg Time Spent: ${data.white.averageTime}
    <br /> Avg Unfocus Time: ${data.white.averageFocus}
    
    <br /> Time Spent StDev: ${data.white.timeStdev}
    <br /> Unfocus time StDev: ${data.white.focusStdev}
    <br />
    <br /> <b>Full move list:</b>`

    for (let i = 0; i < data.white.finalMoves.length; i++) {
      const move = data.white.finalMoves[i]
      wL += `<br /> ${move.move} {Engine: ${move.enginemove}, CPL: ${move.cpl}, Time: ${move.moveTime}, Focus Time: ${move.focusTime}, Suspicion: ${move.suspicion}%}`
    }

    let bL = `<h3>Black Results</h3>
    Avg CPL: ${data.black.averageCpl}
    <br /> Avg Time Spent: ${data.black.averageTime}
    <br /> Avg Unfocus Time: ${data.black.averageFocus}

    <br /> Time Spent StDev: ${data.black.timeStdev}
    <br /> Unfocus time StDev: ${data.black.focusStdev}
    <br />
    <br /> <b>Full move list:</b>`

    for (let i = 0; i < data.black.finalMoves.length; i++) {
      const move = data.black.finalMoves[i]
      bL += `<br /> ${move.move} {Engine: ${move.enginemove}, CPL: ${move.cpl}, Time: ${move.moveTime}, Focus Time: ${move.focusTime}, Suspicion: ${move.suspicion}%}`
    }

    $whiteResults.html(wL)
    $blackResults.html(bL)
    console.log(wL)
    console.log(bL)
  })
})

$reset.click(function () {
  console.log('Resetting...')

  $pgn.html('')
  $pgn.show()

  $fen.html('')
  $fen.show()

  $finalpgn.html('')
  $finalpgn.hide()

  $load.hide()

  $status.html('White to move')

  $statuses.show()

  $blackResults.html('')
  $whiteResults.html('')

  timestamps = []
  focusBasket = 0
  outOfFocus = 0
  focusTimes = []

  moveStart = Date.now()

  game.reset()
  board.position(game.fen())
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
  $submit.show()
  $reset.show()
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
