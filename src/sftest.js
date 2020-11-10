const stockfish = require('stockfish')
const engine = stockfish()

function send (str) {
  console.log('Sending: ' + str)
  engine.postMessage(str)
}

engine.onmessage = function (line) {
  console.log('Line: ' + line)
}

send('uci')
// send('isready')
send('setoption name MultiPV value 1')
send('isready')

function sendOnReady(cmd) {
    send('isready')
}

send('position startpos moves e2e4 g7g5 f1c4 a7a6 d1f3 c7c6 d2d3')
function sendOnReady() {
    
}
send('go infinite depth ' + 15)
