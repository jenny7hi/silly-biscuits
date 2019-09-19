from Game import Game
import os

def silly_biscuits():
	setup_console()
	welcome_prompt()

# sets up console window to appropriate size for printing game
def setup_console():
	cmd = 'mode 120,40'
	os.system(cmd)

# rules & prompts user for single vs. multiplayer and initializes game
def welcome_prompt():
	print('Welcome to Silly Biscuits!\n')
	print('RULES\nPlace cards greater than or less than the active card, depending on the direction.\nYou cannot play reserved cards until the deck is empty, and you cannot play hidden\nreserved cards until the public card above has been used. 2, 8, and 10 are special cards,\nas explained below. Objective is to play all your cards. ')
	print('\nCOMMANDS')
	print('\'[card]\' OR \'[card] from hand\': Plays specified card from hand.')
	print('\'[card] from public\': Plays specified card from public reserved cards.')
	print('\'[n] from hidden\': Plays nth hidden card.')
	print('\'skip\': Skips your current turn.')
	print('\n*SPECIAL CARDS*')
	print('A: Can be the biggest number if direction is going up and smallest number if direction is going down.')
	print('2: Reverses direction, goes from last played card.')
	print('8: Next player can play any card.')
	print('10: Current player can play any card.')
	print('\n-HIDDEN CARDS-')
	print("Players do not know hidden cards before playing. If played and not legal, card is made public and turn is lost.")
	print('\n\nHow many players are there? ')
	num_players = int(input())
	while num_players < 1:
		print('Oops! There needs to be at least one player.')
		num_players = int(input())
	game = Game(num_players)
	game.start()

# This if statement passes if this was the file that was executed
if __name__ == '__main__':
	silly_biscuits()
