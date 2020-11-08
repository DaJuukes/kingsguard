module.exports = {
  randomLegalMove: function (game) {
    const possibleMoves = game.moves()
    const randomIdx = Math.floor(Math.random() * possibleMoves.length)
    return possibleMoves[randomIdx]
  }
}
