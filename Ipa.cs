// It looks like datamuse IPA transciptions don't have any diacritics?
// nor any double character consonants?

// not using 'char' as some characters in the vowel set are two characters that display as one

public class IPA {

    public IPA(string ipaString) {
        var phenomes = stringToPhenomes(ipaString);

        var syllables =

    }

    private List<Phenome> stringToPhenomes(string ipaString) {
        var phenomes = new List<Phenome>();
        int i=0;
        while (i < ipaString.Length)
        {
            // if it starts with any vowels
            var startingVowel = Phenome.vowels.FirstOrDefault(v => ipaString.IndexOf(v, i) == 0);
            if (startingVowel != null) {
                phenomes.Add(new Phenome(startingVowel));
                i = i + startingVowel.Length;
            } else {
                phonomes.Add(new Phenome(ipaString[i]));
                i++;
            }
        }
    }
}

public class Phenome {
    public bool isVowel;
    public bool isConsonant;

    public bool isStress;

    public string value;

    public Phenome(string input) {
        value = input;
        if (vowels.Contains(input)) {
            isVowel = true;
            isConsonant = false;
            isStress = false;
        } else if (input == primaryStressSymbol || input == secondaryStressSymbol) {
            isVowel = false;
            isConsonant = false;
            isStress = true;
        } else {
            isVowel = false;
            isConsonant = true;
            isStress = false;
        }
    }

    const string primaryStressSymbol = 'ˈ';
    const string secondaryStressSymbol = 'ˌ';

    public static Set<string> vowels = new HashSet<string> {
        "y",
        "ɨ",
        "ʉ",
        "ɯ",
        "u",
        "ɪ",
        "ʏ",
        "ʊ",
        "e",
        "ø",
        "ɘ",
        "ɵ",
        "ɤ",
        "o",
        "e̞",
        "ø̞",
        "ə",
        "ɤ̞",
        "o̞",
        "ɛ",
        "œ",
        "ɜ",
        "ɞ",
        "ʌ",
        "ɔ",
        "æ",
        "ɐ",
        "a",
        "ɶ",
        "ä",
        "ɑ",
        "ɒ"
    };

}