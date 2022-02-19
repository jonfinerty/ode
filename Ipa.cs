// It looks like datamuse IPA transciptions don't have any diacritics?
// nor any double character consonants?

// not using 'char' as some characters in the vowel set are two characters that display as one

public class Syllable {
    public List<Phenome> phenomes = new List<Phenome>();

    // remove stresses
    public List<Phenome> GetOnset() {
        return phenomes.TakeWhile(p => !p.isVowel).Where(p => !p.isStress).ToList();
    }

    public bool HasValidOnset() {
        var onset = GetOnset();
        if (onset.Count == 0) {
            return true;
        }

        if (onset.Count == 1 && onset[0].value != "ŋ") {
            return true;
        }

        var stringOnset = string.Join("", onset.Select(o => o.value));
        // Console.WriteLine(stringOnset);
        // Console.WriteLine(validOnsets.Contains(stringOnset));
        return validOnsets.Contains(stringOnset);
    }

    public override string ToString()
    {
        return String.Join("",phenomes.Select(p => p.value));
    }

    private HashSet<string> validOnsets = new HashSet<string> {
        "pl", "bl", "kl", "gl", "pr", "br", "tr", "dr", "kr", "gr", "tw", "dw", "gw", "kw", "pw",
        "fl", "sl", "θl", "ʃl", "vl", "fr", "θr", "ʃr", "hw", "sw", "θw", "vw",
        "pj", "bj", "tj", "dj", "kj", "gj", "mj", "nj", "fj", "vj", "θj", "sj", "zj", "hj", "lj",
        "sp", "st", "sk",
        "sm", "sn",
        "sf", "sθ",
        "spl", "skl", "spr", "str", "skr", "skw", "smj", "spj", "stj", "skj",
        "sfr"
    };
}

public class IPA {

    public List<Syllable> Syllables = new List<Syllable>();

    public IPA(string ipaString) {
        var phenomes = stringToPhenomes(ipaString);
        // Console.WriteLine(string.Join(" ", phenomes.Select(p => p.value)));

        // to syllables via https://en.wikipedia.org/wiki/English_phonology#Syllable_structure
        // looks like the datamuse data doesn't have any 'unreduced short vowels' symbols - https://en.wikipedia.org/wiki/Vowel_reduction#transcription
        var syllables = new List<Syllable>();
        var currentSyllable = new Syllable();
        syllables.Add(currentSyllable);
        Phenome previousPhenome = null;
        Syllable previousSyllable = null;
        // first niavely, split by vowel at ends
        foreach (var phenome in phenomes)
        {
            if (previousPhenome != null && 
                previousPhenome.isVowel && (phenome.isConsonant || phenome.isStress)
                ) {
                currentSyllable = new Syllable();
                syllables.Add(currentSyllable);
            }
            currentSyllable.phenomes.Add(phenome);
            previousPhenome = phenome;
        }

        // adjust for valid onsets
        previousSyllable = null;
        // Console.WriteLine(string.Join("-", syllables));
        for (int i=0; i<syllables.Count; i++)
        {
            var syllable = syllables[i];
            while(!syllable.HasValidOnset()) {
                // Console.WriteLine(string.Join("", syllable.GetOnset()));
                var firstPhenome = syllable.phenomes[0];
                syllable.phenomes.RemoveAt(0);
                if (previousSyllable == null) {
                    previousSyllable = new Syllable();
                    syllables = syllables.Prepend(previousSyllable).ToList();
                    i++;
                }
                previousSyllable.phenomes.Add(firstPhenome);
            }

            previousSyllable = syllable;
        }

        Syllables = syllables;
    }

    public List<int> GetSyllableIndexesOfStresses() {
        var indexes = new List<int>();
        int i = 0; 
        foreach(var syllable in Syllables) {
            if (syllable.phenomes.Any(p=>p.isStress)){
                indexes.Add(i);
            }
            i++;
        }
        return indexes;
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
                phenomes.Add(new Phenome(ipaString[i].ToString()));
                i++;
            }
        }
        return phenomes;
    }

    public override string ToString()
    {
        var syllableIndexs = GetSyllableIndexesOfStresses();
        var stresses = "";
        if (syllableIndexs.Count > 0) {
            stresses = String.Join(" ", syllableIndexs);
        }
        return String.Join("-",Syllables) + " stresses on: " + stresses;
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

    public override string ToString()
    {
        return value;
    }

    const string primaryStressSymbol = "ˈ";
    const string secondaryStressSymbol = "ˌ";

    public static HashSet<string> vowels = new HashSet<string> {
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
        "ɒ",
        "i"
    };

}