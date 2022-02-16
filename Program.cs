using System.Text.RegularExpressions;
using System.Text.Json;
using System.Collections.Concurrent;

HttpClient client = new HttpClient();

//csvToJs();
//SyllableCsvPurify();
//DownloadWord().Wait();
// var words = loadWords();
// GetRhymes(words).Wait();
// processRhymes();
// processSyllables();
// csvToJs();
// assignRhymeGroups();
//processWordList();
//var rhymes = await getRhymesFromDatamuse(client, "fiddle");
// foreach (var rhyme in rhymes) {
//     Console.WriteLine(rhyme);
// }
downloadFromDatamuse(client).Wait();
return;
//DownloadAllWords().Wait();

static async Task<Word> getWordFromDatamuse(HttpClient client, string text) {
    var path = "https://api.datamuse.com/words?sp="+text+"&md=sfr&max=1&ipa=1";
    HttpResponseMessage response = await client.GetAsync(path);
    if (response.IsSuccessStatusCode)
    {
        var streamTask = client.GetStreamAsync(path);
        var words = await JsonSerializer.DeserializeAsync<List<DatamuseWord>>(await streamTask);
        if (words == null  || words.Count == 0) {
            Console.WriteLine("Throwing out 1: " + text);
            return null;
        } else {
            var word = words[0];
            if (word.word != text) {
                Console.WriteLine("Throwing out 2: " + text);
                return null;
            }
            return words[0].ToWord();
        }
    } else {
        throw new Exception("AH");
    }
}

static async Task<List<Word>> getRhymesFromDatamuse(HttpClient client, string word) {
    var path = "https://api.datamuse.com/words?rel_rhy="+word+"&md=srf&ipa=1&max=1000";
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
    foreach (string line in File.ReadLines("syllables2.csv"))
    { 
        var word = new Word(line);
        words.TryAdd(word.text, word);
    }

    var thrownOutWords = new ConcurrentDictionary<string, bool>();
    foreach (string line in File.ReadLines("thrown_out_words.csv"))
    { 
        thrownOutWords.TryAdd(line, true);
    }

    int wordsProcessed = 0;
    int apiCalls = 0;

    var inputWords = File.ReadLines("words_raw.txt");

    await Parallel.ForEachAsync(inputWords, async (wordText, token) => {
    //foreach(var wordText in File.ReadLines("words_raw.txt")) {
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
                using (StreamWriter output = new($"thrown_out_words.csv", append: true))
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
                    using (StreamWriter wordOutput = new($"syllables2.csv", append: true))
                    {
                        wordOutput.WriteLine(rhymingWord);
                    }
                }
            }
        }

        lock(rhymeLock)
        {
            using (StreamWriter rhymeOutput = new($"rhymes2.csv", append: true))
            {
                if (wordRhymes.Count > 0) {
                    var line = String.Join(",",wordRhymes.Select(r => r.text));
                    rhymeOutput.WriteLine(line);
                }
            }
        }
        lock(wordsLock)
        {
            using (StreamWriter wordOutput = new($"syllables2.csv", append: true))
            {
                wordOutput.WriteLine(word);
            }
        }

        apiCalls++;
        Console.WriteLine("API calls: " + apiCalls);
        Console.WriteLine("Words discovered: " + words.Count);
    //}
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

static void csvToJs() {
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
}

static List<Word> loadWords() {
    var words = new List<Word>();
    foreach (string line in File.ReadLines("syllables.csv"))
    {  
        var word = new Word(line);
        words.Add(word);
    }  
    return words;
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

static void processSyllables() {
    var words = loadWords();

    words = words.OrderBy(w => w.text).ToList();

    using StreamWriter output = new($"syllables.csv", append: false);

    foreach (var word in words)
    {  
        output.WriteLine(word.ToString());
    }  
}

public class Word {
    public string? text;
    public string? IPA;
    public int syllableCount;
    public double freqScore; // number of times out a 1 million it appears in google book corpus
    public int? primaryStressSyllableIndex;
    public int? secondaryStressSyllableIndex;
    public List<int> rhymeGroups = new List<int>();
    const char primaryStressSymbol = 'ˈ';
    const char secondaryStressSymbol = 'ˌ';

    public Word(){}

    public Word(string text, string IPA, int syllableCount, double freqScore) {
        this.text = text;
        this.IPA = IPA;
        this.syllableCount = syllableCount;
        this.freqScore = freqScore;
        primaryStressSyllableIndex = GetPrimaryStressSyllableIndex(syllableCount, IPA);
        secondaryStressSyllableIndex = GetSecondaryStressSyllableIndex(syllableCount, IPA);
    }

    public Word(string fileLine) {
        var sections = fileLine.Split(',');
        text = sections[0].ToLower();
        syllableCount = int.Parse(sections[1]);
        if (sections[2].Length > 0) {
            primaryStressSyllableIndex = int.Parse(sections[2]);
            if (primaryStressSyllableIndex >= syllableCount) {
                Console.WriteLine("Updating primary syllable stress within bounds");
                primaryStressSyllableIndex = syllableCount-1;
            }
        }
        if (sections[3].Length > 0) {
            secondaryStressSyllableIndex = int.Parse(sections[3]);
            if (primaryStressSyllableIndex >= syllableCount) {
                Console.WriteLine("Updating primary syllable stress within bounds");
                primaryStressSyllableIndex = syllableCount-1;
            }
        }
    }

    public override string ToString()
    {
        return $"{text},{syllableCount},{primaryStressSyllableIndex},{secondaryStressSyllableIndex},{freqScore},{IPA}";
    }

    static int? GetPrimaryStressSyllableIndex(int syllableCount, string pronunciation) {
        if (pronunciation == null) {
            return null;
        }
        var characterIndex = pronunciation.IndexOf(primaryStressSymbol);
        if (characterIndex == -1) {
            return null;
        }

        return EstimateSyllableIndex(syllableCount, pronunciation, characterIndex);
    }

    static int? GetSecondaryStressSyllableIndex(int syllableCount, string pronunciation) {
        if (pronunciation == null) {
            return null;
        }

        var characterIndex = pronunciation.IndexOf(secondaryStressSymbol);
        if (characterIndex == -1) {
            return null;
        }

        return EstimateSyllableIndex(syllableCount, pronunciation, characterIndex);
    }

    static int EstimateSyllableIndex(int syllableCount, string pronunciation, int characterIndex) {
        //Console.WriteLine($"{syllableCount} {characterIndex} {pronunciation} {pronunciation.Length}");
        if (characterIndex == 0) {
            return 0;
        }

        var result = Convert.ToInt32(((double) characterIndex / pronunciation.Length)*syllableCount);
        // it can't be 0
        return Math.Max(1, result);
    }

}

//https://api.datamuse.com/words?sp=flower&md=sfr&max=1&ipa=1
//[{"word":"flower","score":67939,"numSyllables":2,"tags":["pron:F L AW1 ER0 ","ipa_pron:fɫˈaʊɝ","f:28.794326"]}]
// https://api.datamuse.com/words?rel_rhy=flower&md=srf&ipa=1&max=1000
// [{"word":"power","score":5369,"numSyllables":2,"tags":["pron:P AW1 ER0 ","ipa_pron:pˈaʊɝ","f:547.875315"]},
public class DatamuseWord {
    public string word {get; set;}
    public int numSyllables {get; set;}

    public string[] tags {get; set;}

    public double GetFreqScore() {
        return double.Parse(tags[2].Substring(2));
    }

    public string GetIPA() {
        return tags[1].Substring(9);
    }

    public Word ToWord() {
        var word = new Word(this.word, GetIPA(), numSyllables, GetFreqScore());
        return word;
    }
}