# ode

Poetry IDE

/ Poetry language

feature ideas

1 - detect rhyming scheme?
2 - autocomplete rhymes
3 - Online editor


based on the book

- metre
	- iambic pentametre


words broken up into syllables, with accented syllables

## Todo
#### make better word pipeline

pipeline 
wiktionary -> csv's
csvs -> js object

Ideal file artifacts -
syllables.csv - word, syllablesCount, firstStressed, secondStressed
rhymes.csv - word,word,word

read via c#. generate js object
warn if in rhymes but not in syllables
words.js