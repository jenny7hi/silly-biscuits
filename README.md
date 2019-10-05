# Silly Biscuits
Silly Biscuits is a strategy card game that can be played by two or more people. 

## Running the code
1. Clone or download [this repository](https://github.com/jenny7hi/silly-biscuits.git).
2.	In terminal, navigate to location of repository.
3.	Run `python silly_biscuits.py`

## Game rules
### Setup
Each player is dealt five cards in their hand, as well as six reserved cards, three public cards, each on top of one of three hidden cards. One card is placed as the start of the pile, and the remaining are used as a draw deck. There is a direction, which starts up. Objective is to play all hand and reserved cards.
### On each turn
The player must play a card that is: 
- Strictly greater than the last played card on the pile if direction is up.
- Strictly less than the last played card on the pile if direction is down.
- A special card (explained below).
A can be the largest or smallest card, depending on the direction of the game. If going up, A is the largest card that can be played; if going down, A is the smallest.
If the player cannot make a move, they draw a card and lose a turn.
After each play, players draw a card from the deck if there are still cards remaining in the draw deck and they have fewer than five cards in their hand. 
### Reserved cards
Reserved cards cannot be played until there are no more cards in the draw deck. Hidden cards cannot be played until the public card covering it has been played. In addition, a user cannot know the value of a hidden card before playing. If a player plays a hidden card and it is not be a legal move, the card is made public and the player loses their turn. 
### Special cards
Special cards can only be used in the following ways:
- 2: Reverses the direction of the game from the last non-special card.
- 8: Resets the pile. Next player can play anything. Direction is retained.
- 10: Resets the pile. Current player can play anything. Direction is retained.

Why is this game called Silly Biscuits? I honestly have no idea. 

## Playing the game in terminal
On running the program, you will see a short summary of the rules and commands available and be prompted for the number of players. 1 player will enable singleplayer mode, which will have the computer generate plays as the second player. 2 or more players will enable multiplayer mode. 
### Commands
- `[card]` or `[card] from hand` (e.g. `K` or `7 from hand`): play the specified card from hand
- `[card] from public` (e.g. `4 from public`): play the specified public reserved card
- `[n] from hidden` (e.g. `2 from hidden`): plays the nth hidden reserved card
- `skip`: skips the current player and moves on to the next player
### Demo
A demo of the program can be seen [here](https://youtu.be/JeurUTPCWco).

## Program design
### Structure
As a high-level overview:
- `silly_biscuits`
  - Creates a `Game` object
    - Creates deck as a list of `Card` objects. Using a list makes it easy to 
      - slice off sublists (distribute `Card`s among `Player`s)
      - sort `Card`s by value property and maintain order
      - access `Card`s by index
    - Creates a list of multiple `Player` objects. Using a list makes it easy to iterate through players on each turn. A `Player` object contains the following lists of `Card`s:
      - `hand`
      - `public`
      - `hidden`
### Logic
`Game.start()` starts an indefinite loop until there is a winner or a draw. On each iteration:
- Print the current game setup and status.
- `Game.has_plays()` checks that the player has a card that can be legally played. 
  - If so, `Game.parse_play()` accepts text input from the user and parses it.
  - `Player.can_play()` checks that the user input is a card that the user has and can play.
    - If so, `Game.is_legal_play()` checks that the card can be legally played. If so:
      - Update status and message properties of `Game`
      - Update appropriate card lists for `Player`
If any of the above checks don’t go through
- Update `Game.message`
- `Game.next_player()`
- Break out of current iteration
### Design choices
- `Game.active` as a list of `Card`s, as opposed to a single `Card`. Since in some cases (i.e. when some special cards are played) I need to keep track of and indefinite number of previous cards, I decided to keep a list of all played cards rather than just one variable for the last played card. This also makes it easier to print play history on each turn, a feature that is helpful in singleplayer mode when you want to know if the computer played special or multiple cards.
- Checking for `has_plays` before `parse_play`. Although this seems like an extra check, it allows the code to end the game before checking if an input is valid if there are no more possible plays. 
- ‘Player.hand’ as a list of `Card`s, as opposed to a set. since `hand` will always be sorted and printed in increasing order that updates with each draw, its code representation doesn’t have to be in order, and performance for sorting and looking up would be actually be better if it was represented in an unordered set as opposed to an ordered list. However, I chose to use a list to maintain consistency with `public` and `hidden` lists of `Player`, so that all three can use the same functions and code can be simplified.
- Creating a `NONE_CARD` null. Since for `public` and `hidden` displays it’s important to maintain card positions even when cards have been played, I created this proxy null card to be able to easily tell when this is the case.
### Edge cases
Some edge cases that were covered:
- Fewer than 1 players were specified
- Player tries plays a card that they don’t have
- Player tries to play a public reserved card when there are still cards in the draw deck
- Player tries to play a hidden reserved card when the public card covering it has not yet been played
- Player tries to play a hidden card that they have already played
### Tools
I used Python to create this program, simply because it is the language I am most comfortable and familiar with. Libraries I used:
- `os` to resize terminal window to allow for proper printing of UI
- `random` to shuffle list of `Card`s for deck
- `math` to determine number of decks to use (`num_players / 3` rounded up)

