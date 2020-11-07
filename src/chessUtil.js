module.exports = {
    randomLegalMove: function (game) {
        let possibleMoves = game.moves()
        var randomIdx = Math.floor(Math.random() * possibleMoves.length)
        return possibleMoves[randomIdx]
    }
}