from Card import Card, VALUE_TO_FACE, SPECIAL_CARDS
from Player import Player
import math
import random

class Game:
	def __init__(self, num_players):

		# setup cards and players
		self.players = []
		self.active = []
		self.deck = []
		self.is_singleplayer = num_players == 1
		self.num_players = 2 if self.is_singleplayer else num_players
		self.setup_cards()

		# setup status
		self.curr_player = 0
		self.is_going_up = self.active[0].value != 2
		self.winner = None

		# messages
		self.player_message = 'Player 1\'s turn.'
		self.message = 'Play a card.'

	"""
	Gameplay
	"""

	# play game
	def start(self):
		self.play()

	# shuffles and distributes cards among players and decks
	def setup_cards(self):
		num_players = self.num_players
		# more players = more decks
		num_decks = math.ceil(self.num_players / 3)
		deck = self.shuffle(num_decks)
		# distributing cards among players and decks
		for player in range(self.num_players):
			self.players.append(Player(deck[player * 11: (1 + player) * 11]))
		self.active = [deck[self.num_players * 11]]
		self.deck = deck[num_players * 11 + 1:]

	# shuffle decks based on number of decks
	def shuffle(self, num_decks):
		deck = []
		for value in range(13):
			for x in range(4 * num_decks):
				deck.append(Card(value+1))
		random.shuffle(deck)
		return deck

	# prompts user for input and processes it
	def play(self):
		while True:
			self.print()
			player = self.players[self.curr_player]
			if self.has_plays(player):

				# singleplayer
				if self.is_singleplayer and self.curr_player == 1:
					card, message = self.naive_computer_player()
					self.message = message

				# multiplayer
				else:
					# parse command
					face, _from = self.parse_play()
					# get card referred to from command if player has card
					card, message = player.can_play(face, _from, len(self.deck))
				if card:
					if self.is_legal_play(card):
						self.make_play(card, _from, player)
						if player.is_winner:
							self.end_game('win')
							return
						self.active.append(card)
						if len(player.hand) <= 5 and self.deck:
							player.draw(self.deck.pop())
						if not message and card.face not in SPECIAL_CARDS:
							self.message = 'Play a card.'
						if card.value != 10:
							self.next_player()
					# played a hidden card, but play was not legal
					# make card public
					elif _from == 'hidden':
						to_public = card
						card.played = False
						card.hidden = False
						player.public[int(face)-1] = to_public
						self.message = 'Previous player played an illegal hidden card %s and loses their turn.'%card.face
						self.next_player()
					else:
						self.message = 'That\'s not a legal play. Play another card.'
				else:
					self.message = message
			# no possible moves
			else:
				if self.deck:
					player.draw(self.deck.pop())
					self.message = 'You have no playable cards. Cards were drawn from the deck for you. Play a card.'
				else:
					self.next_player()
					self.end_game('win')
					return
		self.end_game('draw')

	# checks if player has a card that can be legally played
	def has_plays(self, player):
		playable_cards = player.hand if self.deck else player.hand + player.public
		for card in playable_cards:
			if self.is_legal_play(card):
				return True
		for i in range(3):
			if player.public[i].played and not player.hidden[i].played:
				return True
		return False

	# parses play command
	def parse_play(self):
		play = input().lower()
		if play == 'skip':
			self.message = 'Previous player skipped turn. Play a card.'
			self.next_player()
		face, _from = None, None
		play.strip()
		params = play.split(' from ')
		if len(params) == 1:
			face = params[0].upper()
			_from = 'hand'
		if len(params) == 2:
			face, _from = params[0].upper(), params[1]
		if face not in VALUE_TO_FACE.values() and face != '1':
			face = None
			self.message = 'Not a valid card. Play another card.'
		if _from != 'hand' and _from != 'public' and _from != 'hidden':
			_from = None
			self.message = 'Not a valid play. Play another card.'
		return face, _from

	# checks if play is legal
	def is_legal_play(self, card):
		prev = self.active[-1]
		value = card.value
		if card.face in SPECIAL_CARDS or prev.face == '10' or prev.face == '8':
			return True
		if prev.value == 2:
			if len(self.active) == 1:
				prev.value = 14
			for c in reversed(self.active):
				if c.face not in SPECIAL_CARDS:
					prev = c
					break
		if card.face == 'A':
			value = 14 if self.is_going_up else 1
			return prev.face != 'A'
		return value > prev.value if self.is_going_up else value < prev.value

	# updates status of game for a move
	def make_play(self, card, _from, player):
		if card.face == 'A':
			card.value = 14 if self.is_going_up else 1
		if card.value == 10:
			self.message = 'The pile has been reset. Player %s goes again.'%(self.curr_player+1)
		if card.value == 2:
			self.is_going_up = not self.is_going_up
			prev = None
			for c in reversed(self.active):
				if c.face not in SPECIAL_CARDS:
					prev = c
					break
			self.message = 'The direction is now %s from %s.'%('up' if self.is_going_up else 'down', prev.face if prev else 'anything')
		if card.value == 8:
			self.message = 'Going %s from anything.'%('up' if self.is_going_up else 'down')
		return player.make_play(card, _from)

	# move on to next player
	def next_player(self):
		self.curr_player = (self.curr_player + 1) % self.num_players
		self.player_message = 'Player %s\'s turn.'%(self.curr_player+1)

	# end game and print status
	def end_game(self, status):
		if status == 'draw':
			print('GAME OVER -- DRAW. \nNo more possible moves. ')
		elif status == 'win':
			print('GAME OVER. \nPlayer %s won!' % (self.curr_player + 1))

	"""
	Computer player for singleplayer mode
	"""

	# naive computer player logic for singleplayer game
	def naive_computer_player(self):
		player = self.players[1]
		len_deck = len(self.deck)
		for card in player.hand:
			if self.is_legal_play(card) and player.can_play(card.face, 'hand', len_deck):
				return card, 'Computer played a %s. Your turn.'% card.face
		if not self.deck:
			for card in player.public:
				if self.is_legal_play(card) and player.can_play(card.face, 'public', len_deck):
					return card, 'Computer played a %s. Your turn.'% card.face
			for card in player.hidden:
				if self.is_legal_play(card) and player.can_play(card.face, 'hidden', len_deck):
					return card, 'Computer played a %s. Your turn.'% card.face

	"""
	Printing UI
	"""

	# print game screen
	def print(self):
		# print rules and reminders of commands and special cards
		self.print_info()

		# print game status: current card & cards remaining in deck
		last_card = self.active[-1] if self.active else []
		if self.active:
			self.active[-1].print()
		print('\t\t\t%s cards remaining in deck.'%len(self.deck))
		print('Play history:\t\t\t\t\t\t\t\t\t\tDirection: going %s.'%('up' if self.is_going_up else 'down'))
		print([card.face for card in self.active])

		# divider
		print('\n------------------------------------------------------------------------------------------------------------------------')

		# print player cards
		player = self.players[self.curr_player]
		player.print()
		print('\n')

		# print prompt
		print(self.player_message)
		print(self.message)

	# prints rules and reminders of commands and special cards
	def print_info(self):
		print('\nSilly Biscuits\n')
		print('COMMANDS')
		print('\'[card]\' OR \'[card] from hand\': plays specified card from hand')
		print('\'[card] from public\': plays specified card from public reserved cards')
		print('\'[n] from hidden\': plays nth hidden card')
		print('\'skip\': skips your current turn')
		print('\n*SPECIAL CARDS*')
		print('A: biggest or smallest\t2: reverses direction\t8: next player plays any card\t10: current player plays any card')
		print('\n-HIDDEN CARDS-')
		print("Players do not know hidden cards before playing. If played and not legal, card is made public and turn is lost.\n")
