let board = null
const game = new Chess()
const $status = $('#status')
const $fen = $('#fen')
const $pgn = $('#pgn')
const $submit = $('#submit')
const $load = $('#load')

// Websocket interactions
const webSocket = new WebSocket('ws://localhost:3000')

// Focus tracker
let outOfFocus = 0
let focusBasket = 0
game.focusTimes = []

let finalpgn = ''
let timestamps = []

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
    game.move(event.data)
    updateStatus()
  }
}

webSocket.onclose = function (event) {
  console.log('WebSocket closed.')
}

$submit.click(function () {
  // We can assume finalpgn and timestamps are populated from the websocket function
  $submit.hide()
  $fen.hide()
  $pgn.hide()
  $load.show()
  $.get('/analyze', { pgn: game.history(), moveTimes: timestamps, focusTimes: game.focusTimes }, function (data) {
    console.log(data)
  })
})

function onDragStart (source, piece, position, orientation) {
  // do not pick up pieces if the game is over
  if (game.game_over()) return false

  // only pick up pieces for the White side
  if (game.turn() === 'b') {
    return false
  }
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
  webSocket.send(game.history()[game.history().length - 1])

  updateStatus()
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd () {
  board.position(game.fen())
}

function updateStatus () {
  let status = ''
  game.focusTimes.push(focusBasket)
  focusBasket = 0

  let moveColor = 'White'
  if (game.turn() === 'b') {
    moveColor = 'Black'
  }

  // checkmate?
  if (game.in_checkmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.'
    $submit.show()
  }

  // draw?
  else if (game.in_draw()) {
    status = 'Game over, drawn position'
    $submit.show()
  }

  // game still on
  else {
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

const config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
}
board = Chessboard('myBoard', config)

updateStatus()

function visibilityChange () {
  if (document.visibilityState === 'hidden') {
    // Track total time hidden in current move
    outOfFocus = Date.now()
  } else if (document.visibilityState === 'visible') {
    focusBasket += (Date.now() - outOfFocus)
  }
}

document.addEventListener('visibilitychange', visibilityChange)
