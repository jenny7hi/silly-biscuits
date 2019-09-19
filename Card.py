VALUE_TO_FACE = {
	0: '',
	1: 'A',
	2: '2',
	3: '3',
	4: '4',
	5: '5',
	6: '6',
	7: '7',
	8: '8',
	9: '9',
	10: '10',
	11: 'J',
	12: 'Q',
	13: 'K',
	14: 'A',
}

SPECIAL_CARDS = ['2', '8', '10']

class Card:
	def __init__(self, value, hidden = False, played = False):
		self.value = value
		self.face = VALUE_TO_FACE[value]
		self.hidden = False
		self.played = False

	# prints a card image in center of window
	def print(self):
		tabs = '\n\t\t\t\t\t\t\t'
		top = '|‾‾‾‾|' if self.value == 10 else '|‾‾‾|'
		if self.face in SPECIAL_CARDS:
			face = '|*%s*|'% self.face
		else:
			face = '| %s |'%self.face
		bottom = '|____|' if self.value == 10 else '|___|'
		print(tabs + top, end = '')
		print(tabs + face, end = '')
		print(tabs + bottom, end = '\t')

NONE_CARD = Card(0, True, True)
