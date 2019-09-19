from Card import NONE_CARD, SPECIAL_CARDS

# tab offset for printing cards
TABS = {
	1: '\n\t\t\t\t\t\t\t',
	2: '\n\t\t\t\t\t\t',
	3: '\n\t\t\t\t\t\t',
	4: '\n\t\t\t\t\t',
	5: '\n\t\t\t\t\t',
	6: '\n\t\t\t\t',
	7: '\n\t\t\t\t',
	8: '\n\t\t\t',
	9: '\n\t\t\t',
	10: '\n\t\t',
	11: '\n\t\t',
	12: '\n\t',
	13: '\n\t',
	14: '\n',
	15: '\n',
}

class Player:
	def __init__(self, cards):
		self.hand = cards[:5]
		self.hand.sort(key = lambda card: card.value)
		self.hidden = cards[5:8]
		for card in self.hidden:
			card.hidden = True
			card.played = False
		self.public = cards[8:11]
		for card in self.public:
			card.played = False
		self.is_winner = False

	# makes sure that specified card can be played based on the following:
	# 1) player has the card
	# 2) player has the card in a deck that they can access
	def can_play(self, face, _from, len_deck):
		card, message = None, None
		if _from == 'hand':
			card = self.can_play_from_not_hidden(face, self.hand)
			if not card:
				message = 'You don\'t have this card. Play another card.'
		elif _from == 'public':
			if len_deck == 0:
				card = self.can_play_from_not_hidden(face, self.public)
				if not card:
					message = 'You don\'t have this card. Play another card.'
			else:
				message = 'You cannot play your public cards until the deck is empty. Play another card.'
		elif _from == 'hidden':
			if face == '1' or face == '2' or face == '3':
				index = int(face)
				card, message = self.can_play_from_hidden(index-1)
			else:
				message = 'This is not a valid play. Choose whether you want to play hidden card 1, 2, or 3.'
		return card, message

	# checks that specified card can be played from a non-hidden deck (hand, public)
	def can_play_from_not_hidden(self, face, _from):
		for card in _from:
			if face == card.face and not card.played:
				return card
		return None

	# checks that specified card can be played from hidden deck
	def can_play_from_hidden(self, index):
		if not self.hidden[index].played:
			if self.public[index].played:
				return self.hidden[index], None
			else:
				message = "You must play the public card on top of this card first. Play another card."
		else:
			message = "You have already played this card. Play another card."
		return None, message

	# makes a move and reflects appropriate changes to player instance variables
	def make_play(self, card, _from):
		if _from == 'hand':
			if card in self.hand:
				self.hand.remove(card)
		elif _from == 'public' or _from == 'hidden':
			card.played = True
			card.hidden = False
		if len(self.hand) == 0:
			reserved = self.get_reserved()
			all_none = True
			for card in reserved:
				if card != NONE_CARD:
					all_none = False
			self.is_winner = all_none

	# add a drawn card to hand
	def draw(self, card):
		self.hand.append(card)
		self.hand.sort(key = lambda card: card.value)

	# get combined visible public and hidden decks based on already played cards
	def get_reserved(self):
		reserved = []
		for i in range(3):
			if not self.public[i].played:
				reserved.append(self.public[i])
			else:
				hidden_card = self.hidden[i]
				if not hidden_card.played:
					reserved.append(hidden_card)
				else:
					reserved.append(NONE_CARD)
		return reserved

	# prints reserved and hand
	def print(self):
		self.print_card_row(self.get_reserved())
		print(TABS[1] + 'Reserved')
		self.print_card_row(self.hand)
		print(TABS[1] + 'Hand')

	# prints one row of cards centered in terminal window
	def print_card_row(self, cards):
		tabs = TABS.get(len(cards), '\n')
		print(tabs, end = '')
		for card in cards:
			if card.value == 0:
				top = '     '
			else:
				top = '|‾‾‾‾|' if not card.hidden and card.value == 10 else '|‾‾‾|'
			print(top, end = '\t')
		print(tabs, end = '')
		for i in range(len(cards)):
			card = cards[i]
			if card.value == 0:
				face = '   '
			else:
				if card.hidden:
					face = '|-%s-|'%(i+1)
				elif card.face in SPECIAL_CARDS:
					face = '|*%s*|'% card.face
				else:
					face = '| %s |'%card.face
			print(face, end = '\t'),
		print(tabs, end = '')
		for card in cards:
			if card.value == 0:
				bottom = '     '
			else:
				bottom = '|____|' if not card.hidden and card.value == 10 else '|___|'
			print(bottom, end = '\t'),
