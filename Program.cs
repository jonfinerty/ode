using System.Text.Json;
using System.Collections.Concurrent;

HttpClient client = new HttpClient();

sanitiseRhymes();
var datamuseWords = LoadWords("words.csv");
csvsToJs(100000, datamuseWords);
csvsToJs(150000, datamuseWords);
csvsToJs(200000, datamuseWords);
csvsToJs(250000, datamuseWords);
csvsToJs(300000, datamuseWords);
return;

static void sanitiseRhymes(){
    var rhymeGroups = new HashSet<HashSet<string>>();
    foreach(string line in File.ReadLines("rhymes.csv")) {
        var rhymingGroup = line.Split(',').Distinct().ToHashSet();
        if (rhymingGroup.Count > 1) {
            rhymeGroups.Add(rhymingGroup);
        }
    }

    // remove any pure subsets
    var rhymeGroupList = rhymeGroups.ToList();
    for (int i=0; i<rhymeGroupList.Count; i++) {
        for (int j=i+1; j<rhymeGroupList.Count; j++) {
            var iSubsetOfJ = rhymeGroupList[i].IsSubsetOf(rhymeGroupList[j]);
            var jSubsetOfI = rhymeGroupList[j].IsSubsetOf(rhymeGroupList[i]);

            if (iSubsetOfJ) {
                Console.WriteLine("Subset found: " + string.Join(",",rhymeGroupList[i]));
            }
            if (jSubsetOfI) {
                Console.WriteLine("Subset found: " + string.Join(",",rhymeGroupList[j]));
            }
        }
    }

    Console.WriteLine(rhymeGroups.Where(g => g.Count > 50).Count());

    var sortedRhymes = rhymeGroups.Select(g => string.Join(",",g.OrderBy(w => w))).OrderBy(g => g);

    using StreamWriter output = new("rhymes.csv", append: false);
    foreach (var group in sortedRhymes) {
        output.WriteLine(group);
    }
}


static Dictionary<string, Word> LoadWords(string filename) {
    var words = new Dictionary<string, Word>();
    Console.WriteLine("Loading words");
    int counter = 0;
    foreach (string line in File.ReadLines(filename))
    { 
        var word = new Word(line);
        words.TryAdd(word.text, word);
        counter++;
        Console.WriteLine("words loaded: " + counter);
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

static HashSet<string> LoadParticleOverrides() {
    var words = new HashSet<string>();

    foreach (string line in File.ReadLines("poetic_particle_overrides.csv"))
    { 
        words.Add(line);
    }

    return words;
} 

static void csvsToJs(int wordCountLimit, Dictionary<string,Word> datamuseWords) {
    var outputFilename = "docs/js/words_"+wordCountLimit+".js";

    var unaccentedParticles = LoadUnaccentedParticles();

    foreach(var particle in unaccentedParticles) {
        datamuseWords[particle].SetAsUnaccentedParticle();
    }

    
    var particlesOverrides = LoadParticleOverrides();

    foreach(var particle in particlesOverrides) {
        datamuseWords[particle].SetAsParticle();
    }

    datamuseWords = datamuseWords.Where(w => !w.Key.Contains("-")).OrderByDescending(w => w.Value.freqScore).Take(wordCountLimit).ToDictionary(x => x.Key, x => x.Value);

    // assume datamuse rhyme data is better?
    int rhymeIndex = 0;
    var datamuseRhymes = new Dictionary<int, HashSet<string>>();
    foreach(string line in File.ReadLines("rhymes.csv")) {
        var rhymingGroup = line.Split(',').Where(r => !r.Contains("-")).ToHashSet();
        if (rhymingGroup.Count <= 1) {
            continue;
        }
        datamuseRhymes.Add(rhymeIndex, rhymingGroup);
        foreach(string word in rhymingGroup) {
            // might not be in there due to freq threshold
            if (datamuseWords.ContainsKey(word)) {
                datamuseWords[word].rhymeGroups.Add(rhymeIndex);
            }
        }
        rhymeIndex++;
    }

    using StreamWriter output = new(outputFilename, append: false);
    output.WriteLine("\"use strict\";");
    output.WriteLine();
    output.WriteLine("let wordDict = {");
    foreach (var word in datamuseWords.OrderBy(w => w.Key)) {
        output.WriteLine(word.Value.ToJSFormat());
    }
    output.WriteLine("}");
}

static async Task goGetWordTypesAgain(HttpClient client) {

    var wordsToProcess = LoadWords("words.csv");
    var processedWords = new ConcurrentDictionary<string, Word>();
    
    Console.WriteLine(wordsToProcess.Where(w => w.Value.types.Count == 0).Count());

    int wordsProcessed = 0;
    int apiCalls = 0;

    await Parallel.ForEachAsync(wordsToProcess, async (word, token) => {
        wordsProcessed++;

        Console.WriteLine("Words processed: " + wordsProcessed);
        if (word.Value.types.Count > 0) {
            processedWords.TryAdd(word.Key, word.Value);
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
        apiCalls++;
        Console.WriteLine("API calls: " + apiCalls);
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
        var word = new Word(line);
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

public class Word {
    public string text;
    public string IPA;
    public int syllableCount;
    public double freqScore; // number of times out a 1 million it appears in google book corpus
    public HashSet<string> types = new HashSet<string>(); 
    public int primaryStressSyllableIndex;
    public int secondaryStressSyllableIndex;
    public HashSet<int> rhymeGroups = new HashSet<int>();
    const char primaryStressSymbol = 'ˈ';
    const char secondaryStressSymbol = 'ˌ';
    const char typesDelimiter = '|';

    public Word(string text, string IPA, int syllableCount, double freqScore, HashSet<string> types) {
        this.text = text;
        this.IPA = IPA;
        this.syllableCount = syllableCount;
        this.freqScore = freqScore;
        this.types = types;
        var ipa = new IPA(IPA);
        var stresses = ipa.GetSyllableIndexesOfStresses();
        if (stresses.Count > 0) {
            primaryStressSyllableIndex = Math.Min(syllableCount, stresses[0]);
        } else {
            primaryStressSyllableIndex = -1;
        }

        if (stresses.Count > 1) {
            secondaryStressSyllableIndex = Math.Min(syllableCount, stresses[1]);
            if (primaryStressSyllableIndex == secondaryStressSyllableIndex) {
                secondaryStressSyllableIndex = -1;
            }
        } else {
            secondaryStressSyllableIndex = -1;
        }
    }

    public Word(string fileLine) {
        var sections = fileLine.Split(',');
        text = sections[0].ToLower();
        syllableCount = int.Parse(sections[1]);
    
        freqScore = double.Parse(sections[2]);
        IPA = sections[3];
        if (sections.Length > 4) {
            types = sections[4].Split(typesDelimiter).Where(t => !String.IsNullOrWhiteSpace(t)).ToHashSet();
        }
        var ipa = new IPA(IPA);
        var stresses = ipa.GetSyllableIndexesOfStresses();
        if (stresses.Count > 0) {
            primaryStressSyllableIndex = Math.Min(syllableCount-1, stresses[0]);
        } else {
            primaryStressSyllableIndex = -1;
        }

        if (stresses.Count > 1 && syllableCount > 1) {
            secondaryStressSyllableIndex = Math.Min(syllableCount-1, stresses[1]);
            if (primaryStressSyllableIndex == secondaryStressSyllableIndex) {
                secondaryStressSyllableIndex = -1;
            }
        } else {
            secondaryStressSyllableIndex = -1;
        }
        return;
    }

    public void SetAsParticle() {
        if (!types.Contains("p")) {
            types.Add("p");
        }
    }

    public void SetAsUnaccentedParticle() {
        syllableCount = 1;
        primaryStressSyllableIndex = -1;
        secondaryStressSyllableIndex = -1;
        if (!types.Contains("p")) {
            types.Add("p");
        }
    }

    public string ToCSVFormat()
    {
        // stresses are recomputed each time
        return $"{text},{syllableCount},{freqScore},{IPA},{String.Join('|',types)}";
    }

    public string ToJSFormat() {
        if (types.Count == 0) {
            //Console.WriteLine(text);
            types.Add("u");
        }
        var props = $"[{syllableCount},{primaryStressSyllableIndex},{secondaryStressSyllableIndex},[{String.Join(',',rhymeGroups)}],{freqScore},[{String.Join(',',types.Select(t => $"\"{t}\""))}]]";
        return $"\"{text}\":" + props + ',';
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
    }

    public HashSet<string> GetTypes() {
        return tags.Where(t => wordTypes.Contains(t)).ToHashSet();
    }

    public Word ToWord() {
        return new Word(this.word, GetIPA(), numSyllables, GetFreqScore(), GetTypes());
    }
}