using System.Text.Json;
using System.Collections.Concurrent;

HttpClient client = new HttpClient();
//sanitiseDatamuseRhymes();
// csvsToJs(100000);
// csvsToJs(150000);
// csvsToJs(200000);
// csvsToJs(250000);
// csvsToJs(300000);
// csvsToJs(350000);
// csvsToJs(400000);
// csvsToJs(500000);
goGetWordTypes(client).Wait();
return;


static void sanitiseDatamuseRhymes() {
    var datamuseRhymes = new List<List<string>>();
    foreach(string line in File.ReadLines("datamuse_rhymes.csv")) {
        var rhymingGroup = line.Split(',').ToList();
        datamuseRhymes.Add(rhymingGroup);
    }

    for (var i =0; i<datamuseRhymes.Count; i++) {
        for (var j=i+1; j<datamuseRhymes.Count; j++) {
            foreach(var word in datamuseRhymes[i]) {
                if (datamuseRhymes[j].Contains(word)) {
                    Console.WriteLine("Dupe word: " +word);
                }
                break;
            }
        }
    }
}

static void sanitiseDatamuseData() {
    var words = LoadWords("datamuse_words.csv", true);
    var orderedWords = words.Values.OrderBy(w => w.text).Where(w => !w.text.Contains('-')).ToList();
    using (StreamWriter output = new($"datamuse_words2.csv", append: false))
    {
        foreach (var word in orderedWords) {
            output.WriteLine(word.ToCSVFormat());
        }
    }
}

static Dictionary<string, Word> LoadWords(string filename, bool isDatamuseFile) {
    var words = new Dictionary<string, Word>();
    foreach (string line in File.ReadLines(filename))
    { 
        var word = new Word(line, isDatamuseFile);
        words.TryAdd(word.text, word);
    }

    return words;
}

static HashSet<string> LoadUnaccentedParticles() {
    var words = new HashSet<string>();
    foreach (string line in File.ReadLines("one_syllable_articles.csv"))
    { 
        words.Add(line);
    }
    foreach (string line in File.ReadLines("one_syllable_conjuctions.csv"))
    { 
        words.Add(line);
    }
    foreach (string line in File.ReadLines("one_syllable_prepositions.csv"))
    { 
        words.Add(line);
    }
    foreach (string line in File.ReadLines("one_syllable_pronouns.csv"))
    { 
        words.Add(line);
    }

    return words;
} 

static void csvsToJs(int wordCountLimit) {
    var freqThreshold = 0;
    //var wordCountLimit = 200000;
    var outputFilename = "docs/js/words_"+wordCountLimit+".js";

    var mergedWords = new Dictionary<string, Word>();

    var unaccentedParticles = LoadUnaccentedParticles();
    var wiktionaryWords = LoadWords("wiktionary_syllables.csv", false);
    var datamuseWords = LoadWords("datamuse_words.csv", true);

    // assume wiktionary word crawl is more correct
    foreach(var word in wiktionaryWords) {
        if (unaccentedParticles.Contains(word.Key)){
            word.Value.SetAsUnaccentedParticle();
        }
        mergedWords.Add(word.Key, word.Value);
    }

    foreach(var word in datamuseWords) {
        if (mergedWords.ContainsKey(word.Key)) {
            // wiktionary words don't have IPA or Freq stored
            mergedWords[word.Key].IPA = word.Value.IPA; 
            mergedWords[word.Key].freqScore = word.Value.freqScore; 
        } else if (word.Value.freqScore > freqThreshold) {
            mergedWords.Add(word.Key, word.Value);
        }
    }

    foreach(var particle in unaccentedParticles) {
        mergedWords[particle].SetAsUnaccentedParticle();
    }

    mergedWords = mergedWords.OrderByDescending(w => w.Value.freqScore).Take(wordCountLimit).ToDictionary(x => x.Key, x => x.Value);

    // assume datamuse rhyme data is better?
    int rhymeIndex = 0;
    var datamuseRhymes = new Dictionary<int, List<string>>();
    foreach(string line in File.ReadLines("datamuse_rhymes.csv")) {
        var rhymingGroup = line.Split(',').Where(r => !r.Contains("-")).ToList();
        if (rhymingGroup.Count <= 1) {
            continue;
        }
        datamuseRhymes.Add(rhymeIndex, rhymingGroup);
        foreach(string word in rhymingGroup) {
            // might not be in there due to freq threshold
            if (mergedWords.ContainsKey(word)) {
                mergedWords[word].rhymeGroups.Add(rhymeIndex);
            }
        }
        rhymeIndex++;
    }

    // backfill any missing rhymes with wiktionary
    var wiktionaryRhymes = new List<List<string>>();
    foreach(string line in File.ReadLines("wiktionary_rhymes.csv")) {
        var rhymingGroup = line.Split(',').ToList();
        wiktionaryRhymes.Add(rhymingGroup);
    }

    foreach(var word in mergedWords) {
        if (word.Value.rhymeGroups.Count == 0) {
            var rhymeFound = false;

            var wiktionaryRhymingGroups = wiktionaryRhymes.Where(r => r.Contains(word.Key));
            foreach (var wiktionaryRhymingGroup in wiktionaryRhymingGroups) {
                foreach (var wiktionaryRhymingWord in wiktionaryRhymingGroup) {
                    // see if we have a datamuses group with this word if so, add unrhymed word to it
                    foreach (var datamuseRhymingGroup in datamuseRhymes) {
                        if (datamuseRhymingGroup.Value.Contains(wiktionaryRhymingWord)) {
                            word.Value.rhymeGroups.Add(datamuseRhymingGroup.Key);
                            rhymeFound = true;
                            break;
                        }
                    }
                    if (rhymeFound) {
                        break;
                    }
                }
                if (rhymeFound) {
                    break;
                }
            }
        }
    }

    using StreamWriter output = new(outputFilename, append: false);
    output.WriteLine("\"use strict\";");
    output.WriteLine();
    output.WriteLine("let wordDict = {");
    foreach (var word in mergedWords.OrderBy(w => w.Key)) {
        output.WriteLine(word.Value.ToJSFormat());
    }
    output.WriteLine("}");

    /*
    // read syllables.csv
    var words = new Dictionary<string, Word>();
    foreach (string line in File.ReadLines("syllables.csv"))
    { 
        var word = new Word(line);
        words.Add(word.text, word);
    }
    // read rhymes.csv
    int rhymeIndex = 0;
    foreach(string line in File.ReadLines("rhymes.csv")) {
        var rhymingGroup = line.Split(',');
        foreach(string word in rhymingGroup) {
            words[word].rhymeGroups.Add(rhymeIndex);
        }
        rhymeIndex++;
    }

    using StreamWriter output = new($"docs/js/words.js", append: false);
    output.WriteLine("\"use strict\";");
    output.WriteLine();
    output.WriteLine("let wordDict = {");
    foreach (var word in words) {
        var props = $"[{word.Value.syllableCount},{word.Value.primaryStressSyllableIndex},{word.Value.secondaryStressSyllableIndex},[{String.Join(',',word.Value.rhymeGroups)}]],";
        output.WriteLine($"\"{word.Value.text}\":" + props);
    }
    output.WriteLine("}");
    */
}

static async Task goGetWordTypes(HttpClient client) {

    var wordsToProcess = LoadWords("datamuse_words.csv", true);
    var processedWords = new ConcurrentDictionary<string, Word>();
    
    int wordsProcessed = 0;
    int apiCalls = 0;

    await Parallel.ForEachAsync(wordsToProcess, async (word, token) => {
        wordsProcessed++;
        // if (wordsProcessed > 100) {
        //     return;
        // }
        Console.WriteLine("Words processed: " + wordsProcessed);
        if (processedWords.ContainsKey(word.Value.text)) {
            return;
        }

        var apiWord = await getWordFromDatamuse(client, word.Value.text);
        apiCalls++;
        if (apiWord == null) {
            Console.WriteLine("WEIRD CANT FIND WORD "+ word.Value.text);
            return;
        }

        var wordText = apiWord.text;
        processedWords.TryAdd(wordText, apiWord);
        var wordRhymes = await getRhymesFromDatamuse(client, wordText);
        foreach(var rhymingWord in wordRhymes) {
            if (processedWords.ContainsKey(rhymingWord.text)) {
                continue;
            } else {
                processedWords.TryAdd(rhymingWord.text, rhymingWord);
            }
        }

        apiCalls++;
        Console.WriteLine("API calls: " + apiCalls);
        Console.WriteLine("Words discovered: " + processedWords.Count);
    });

    using (StreamWriter wordOutput = new($"datamuse_syllables_with_type.csv", append: false))
    {
        foreach(var word in processedWords) {
            wordOutput.WriteLine(word.Value.ToCSVFormat());
        }
    }
}

static async Task<Word> getWordFromDatamuse(HttpClient client, string text) {
    var path = "https://api.datamuse.com/words?sp="+text+"&md=sfrp&max=50&ipa=1";
    HttpResponseMessage response = await client.GetAsync(path);
    if (response.IsSuccessStatusCode)
    {
        var streamTask = client.GetStreamAsync(path);
        var words = await JsonSerializer.DeserializeAsync<List<DatamuseWord>>(await streamTask);
        if (words == null  || words.Count == 0) {
            Console.WriteLine("Throwing out 1: " + text);
            return null;
        } else {
            var word = words.FirstOrDefault(w => w.word == text);
            if (word == null) {
                Console.WriteLine("Throwing out 2: " + text);
                return null;
            }
            return word.ToWord();
        }
    } else {
        throw new Exception("AH");
    }
}

static async Task<List<Word>> getRhymesFromDatamuse(HttpClient client, string word) {
    var path = "https://api.datamuse.com/words?rel_rhy="+word+"&md=srfp&ipa=1&max=1000";
    HttpResponseMessage response = await client.GetAsync(path);
    if (response.IsSuccessStatusCode)
    {
        var streamTask = client.GetStreamAsync(path);
        var words = await JsonSerializer.DeserializeAsync<List<DatamuseWord>>(await streamTask);
        if (words == null  || words.Count == 0) {
            return new List<Word>();
        } else {
            // filter out spaces from rhymes
            var processedWords = words.Where(w => !w.word.Contains(" ")).Select(w => w.ToWord()).ToList();
            if (processedWords.Count >= 1000) {
                Console.WriteLine("Max limit hit with word: " + word);
            }
            return processedWords;
        }
    } else {
        throw new Exception("AH");
    }
}

static async Task downloadFromDatamuse(HttpClient client) {

    Object throwLock = new Object();
    Object rhymeLock = new Object();
    Object wordsLock = new Object();

    var words = new ConcurrentDictionary<string, Word>();
    foreach (string line in File.ReadLines("datamuse_syllables.csv"))
    { 
        var word = new Word(line, true);
        words.TryAdd(word.text, word);
    }

    var thrownOutWords = new ConcurrentDictionary<string, bool>();
    foreach (string line in File.ReadLines("datamuse_thrown_out_words.csv"))
    { 
        thrownOutWords.TryAdd(line, true);
    }

    int wordsProcessed = 0;
    int apiCalls = 0;

    var inputWords = File.ReadLines("datamuse_words_raw.txt");

    await Parallel.ForEachAsync(inputWords, async (wordText, token) => {
        wordsProcessed++;
        Console.WriteLine("Words processed: " + wordsProcessed);
        if (words.ContainsKey(wordText)) {
            return;
        }

        if (thrownOutWords.ContainsKey(wordText)){
            return;
        }

        var word = await getWordFromDatamuse(client, wordText);
        apiCalls++;
        if (word == null) {
            thrownOutWords.TryAdd(wordText,true);
            lock(throwLock){
                using (StreamWriter output = new($"datamuse_thrown_out_words.csv", append: true))
                {
                    output.WriteLine(wordText);
                }
            }
            return;
        }
        
        words.TryAdd(wordText, word);
        var wordRhymes = await getRhymesFromDatamuse(client, wordText);
       
        foreach(var rhymingWord in wordRhymes) {
            if (words.ContainsKey(rhymingWord.text)) {
                continue;
            } else {
                words.TryAdd(rhymingWord.text, rhymingWord);
                lock(wordsLock) {
                    using (StreamWriter wordOutput = new($"datamuse_syllables.csv", append: true))
                    {
                        wordOutput.WriteLine(rhymingWord);
                    }
                }
            }
        }

        lock(rhymeLock)
        {
            using (StreamWriter rhymeOutput = new($"datamuse_rhymes.csv", append: true))
            {
                if (wordRhymes.Count > 0) {
                    var line = String.Join(",",wordRhymes.Select(r => r.text));
                    rhymeOutput.WriteLine(line);
                }
            }
        }
        lock(wordsLock)
        {
            using (StreamWriter wordOutput = new($"datamuse_syllables.csv", append: true))
            {
                wordOutput.WriteLine(word);
            }
        }

        apiCalls++;
        Console.WriteLine("API calls: " + apiCalls);
        Console.WriteLine("Words discovered: " + words.Count);
    });
}

static void processWordList() {
    var words = new HashSet<string>();
    var bannedLetters = new char[]{' ', '-', '@', '.', '$', 'ǀ', 'ǃ', '/', '&'};
    foreach (var word in File.ReadLines("words_all.txt"))
    {
        var lowercase = word.Trim().ToLower();
        if (lowercase.IndexOfAny(bannedLetters) != -1) {
                continue;
        }
        words.Add(lowercase);
    }
    var ordered = words.OrderBy(w => w);

    using StreamWriter output = new("words_raw.txt", append: false);
    foreach (var word in ordered) {
        output.WriteLine(word);
    }
}

static void processRhymes() {
    List<List<string>> rhymeGroups = new List<List<string>>();
    foreach (string line in File.ReadLines("rhymes.csv"))
    {  
        var group = line.Split(",").ToList();
        if (group.Count() > 1) {
            group.Sort();
            rhymeGroups.Add(group);
        }
    }  

    Console.WriteLine(rhymeGroups.Count());

    var distinct = rhymeGroups.Select(g => String.Join(",",g)).Distinct().ToList();
    distinct.Sort();

    distinct = distinct.Where(d => !distinct.Any(superset => superset.Contains(d) && superset != d)).ToList();

    rhymeGroups = distinct.Select(g => g.Split(",").ToList()).ToList();
    using StreamWriter output = new($"rhymes.csv", append: false);

    foreach (var group in rhymeGroups)
    {  
        var line = String.Join(",",group);
        output.WriteLine(line);
    }  
}

public class Word {
    public string text;
    public string IPA;
    public int syllableCount;
    public double freqScore; // number of times out a 1 million it appears in google book corpus
    public string[] types; 
    public int primaryStressSyllableIndex;
    public int secondaryStressSyllableIndex;
    public List<int> rhymeGroups = new List<int>();
    const char primaryStressSymbol = 'ˈ';
    const char secondaryStressSymbol = 'ˌ';
    const char typesDelimiter = '|';

    public Word(string text, string IPA, int syllableCount, double freqScore, string[] types) {
        this.text = text;
        this.IPA = IPA;
        this.syllableCount = syllableCount;
        this.freqScore = freqScore;
        this.types = types;
        primaryStressSyllableIndex = GetPrimaryStressSyllableIndex(syllableCount, IPA);
        secondaryStressSyllableIndex = GetSecondaryStressSyllableIndex(syllableCount, IPA, true);
    }

    public Word(string fileLine, bool isDatamuseWord) {
        var sections = fileLine.Split(',');
        text = sections[0].ToLower();
        syllableCount = int.Parse(sections[1]);
        if (isDatamuseWord) {
            freqScore = double.Parse(sections[2]);
            IPA = sections[3];
            //types = sections[4].Split(typesDelimiter);
            primaryStressSyllableIndex = GetPrimaryStressSyllableIndex(syllableCount, IPA);
            secondaryStressSyllableIndex = GetSecondaryStressSyllableIndex(syllableCount, IPA, isDatamuseWord);
            return;
        }

        // default freq score
        freqScore = 1;

        if (sections[2].Length > 0) {
            primaryStressSyllableIndex = int.Parse(sections[2]);
            if (primaryStressSyllableIndex >= syllableCount) {
                Console.WriteLine("Updating primary syllable stress within bounds");
                primaryStressSyllableIndex = syllableCount-1;
            }
        } else {
            primaryStressSyllableIndex = -1;
        }
        if (sections[3].Length > 0) {
            secondaryStressSyllableIndex = int.Parse(sections[3]);
            if (primaryStressSyllableIndex >= syllableCount) {
                Console.WriteLine("Updating primary syllable stress within bounds");
                primaryStressSyllableIndex = syllableCount-1;
            }
        } else {
            primaryStressSyllableIndex = -1;
        }
    }

    public void SetAsUnaccentedParticle() {
        syllableCount = 1;
        primaryStressSyllableIndex = -1;
        secondaryStressSyllableIndex = -1;
    }

    public string ToCSVFormat()
    {
        // stresses are recomputed each time
        return $"{text},{syllableCount},{freqScore},{IPA},{String.Join('|',types)}";
    }

    public string ToJSFormat() {
        var props = $"[{syllableCount},{primaryStressSyllableIndex},{secondaryStressSyllableIndex},[{String.Join(',',rhymeGroups)}],{freqScore},[{String.Join(',',types)}]]";
        return $"\"{text}\":" + props + ',';
    }

    static int GetPrimaryStressSyllableIndex(int syllableCount, string pronunciation) {
        if (pronunciation == null) {
            return -1;
        }

        if (pronunciation.Length <= 0) {
            return -1;
        }
        var characterIndex = pronunciation.IndexOf(primaryStressSymbol);
        if (characterIndex == -1) {
            return -1;
        }

        return EstimateSyllableIndex(syllableCount, pronunciation, characterIndex);
    }

    static int GetSecondaryStressSyllableIndex(int syllableCount, string pronunciation, bool isDatamuseWord) {
        if (pronunciation == null) {
            return -1;
        }

        if (pronunciation.Length <= 0) {
            return -1;
        }

        var characterIndex = -1;

        if (isDatamuseWord) {
            var firstOccurance = pronunciation.IndexOf(primaryStressSymbol);
            if (firstOccurance != -1) {
                characterIndex = pronunciation.IndexOf(primaryStressSymbol, firstOccurance + 1);
            }
        } else {
            characterIndex = pronunciation.IndexOf(secondaryStressSymbol);
        }

        if (characterIndex == -1) {
            return -1;
        }

        return EstimateSyllableIndex(syllableCount, pronunciation, characterIndex);
    }

    // todo: improve
    static int EstimateSyllableIndex(int syllableCount, string pronunciation, int characterIndex) {
        if (characterIndex == 0) {
            return 0;
        }
        if (syllableCount == 1) {
            return 0;
        }

        var result = Convert.ToInt32(((double) characterIndex / pronunciation.Length)*syllableCount);
        return Math.Clamp(result,1,syllableCount-1);
    }

}

//https://api.datamuse.com/words?sp=flower&md=sfr&max=1&ipa=1
//[{"word":"flower","score":67939,"numSyllables":2,"tags":["pron:F L AW1 ER0 ","ipa_pron:fɫˈaʊɝ","f:28.794326"]}]
// https://api.datamuse.com/words?rel_rhy=flower&md=srf&ipa=1&max=1000
// [{"word":"power","score":5369,"numSyllables":2,"tags":["n","pron:P AW1 ER0 ","ipa_pron:pˈaʊɝ","f:547.875315"]},
// "n" means noun, "v" means verb, "adj" means adjective, "adv" means adverb, "prop" and "u" unknown, can have multiple
public class DatamuseWord {

    private string[] wordTypes = new string[]{
        "n", // noun
        "v", // verb
        "adj", // adjective
        "adv", // adverb
        "prop", // proper noun (will also have 'n')
        "u" // unknown
    };

    public string word {get; set;}
    public int numSyllables {get; set;}

    public string[] tags {get; set;}

    // tag starts with 'f:'
    public double GetFreqScore() {
        var freqTagIdentifier = "f:";
        var freqTag = tags.First(t => t.StartsWith(freqTagIdentifier));
        return double.Parse(freqTag.Substring(freqTagIdentifier.Length));
    }

    // tag starts with 'ipa_pron:'
    public string GetIPA() {
        var ipaTagIdentifier = "ipa_pron";
        var ipaTag = tags.First(t => t.StartsWith(ipaTagIdentifier));
        return ipaTag.Substring(ipaTagIdentifier.Length);
        //return tags[1].Substring(9);
    }

    public string[] GetTypes() {
        return tags.Where(t => wordTypes.Contains(t)).ToArray();
    }

    public Word ToWord() {
        return new Word(this.word, GetIPA(), numSyllables, GetFreqScore(), GetTypes());
    }
}