using System.Text;
using System.Text.RegularExpressions;
using WikiClientLibrary;
using WikiClientLibrary.Client;
using WikiClientLibrary.Generators;
using WikiClientLibrary.Pages;
using WikiClientLibrary.Sites;

//csvToJs();
//SyllableCsvPurify();
//DownloadWord().Wait();
// var words = loadWords();
// GetRhymes(words).Wait();
processRhymes();
// assignRhymeGroups();
return;
//DownloadAllWords().Wait();

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

    using StreamWriter output = new($"words.js", append: false);
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

static string GetPronounciation(WikiPage page) {
    // extract pronounciation
    // grabs the first pronounciation, could improve by preferring the UK once, dealing with read and wind etc.
    var regex = new Regex("\\{\\{IPA\\|en\\|/(.+?)/");
    var matches = regex.Matches(page.Content);
    var firstMatch = matches.FirstOrDefault();
    if (firstMatch != null) { 
        var match = firstMatch.Groups[1].Value;
        if (match.Contains(',')) {
            return match.Split(',')[0];
        }
        return match;
    } else {
        return null;
    }
}

static void processRhymes() {
    List<List<string>> rhymeGroups = new List<List<string>>();
    foreach (string line in File.ReadLines("rhymes2.csv"))
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
    using StreamWriter output = new($"rhymes_processed2.csv", append: false);

    foreach (var group in rhymeGroups)
    {  
        var line = String.Join(",",group);
        output.WriteLine(line);
    }  
}

static List<string> GetRhymeSuffixes(string content) {
    var suffixes = new List<string>();
    
    var regex = new Regex("\\'\\'\\s?([a-zA-Z]+)\\'\\'");
    MatchCollection matches = regex.Matches(content);
    foreach (Match match in matches) {
        suffixes.Add(match.Groups[1].Value);
    }

    if (content.Contains("'' 's''")) {
        suffixes.Add("'s");
    }

    if (content.Contains("'' 'll''")) {
        suffixes.Add("'ll");
    }

    return suffixes;
}

static async Task<List<string>> GetRhyme(WikiSite site, string rhyme, string? previousRhymePage, string? content) {
    var rhymingWords = new List<string>();
    if (content == null) {
        var pageRead = new WikiPage(site, "Rhymes:English/"+rhyme);
        await pageRead.RefreshAsync(PageQueryOptions.FetchContent);

        content = pageRead.Content;
    }
    if (content == null) {
        return rhymingWords;
    }

    var redirect = new Regex("\\#REDIRECT \\[\\[Rhymes:English/(.+?)\\]\\]");
    var redirectMatches = redirect.Matches(content);
    var firstMatch = redirectMatches.FirstOrDefault();
    if (firstMatch != null) { 
        return await GetRhyme(site, firstMatch.Groups[1].Value, rhyme, null);
    }

    var seeAlso = new Regex("\\# See also \\[\\[Rhymes:English/(.+?)\\|");
    MatchCollection seeAlsoMatches = seeAlso.Matches(content);
    foreach (Match match in seeAlsoMatches) {
        var newRhymePage = match.Groups[1].Value;
        if (previousRhymePage == newRhymePage) {
            continue;
        }
        var subrhymes = await GetRhyme(site, newRhymePage, rhyme, null);
        rhymingWords.AddRange(subrhymes);
    }

    var suffixRegex = new Regex("\\#\\s?For more rhymes, add (.+?) to some .+Rhymes:English/(.+?)\\|");
    MatchCollection suffixRegexMatches = suffixRegex.Matches(content);
    foreach (Match match in suffixRegexMatches) {
        var unproccessedSuffixes = match.Groups[1].Value; // e.g. "''s'', ''es'' or '' 's''"
        var processedSuffixes = GetRhymeSuffixes(unproccessedSuffixes);
        var newRhymePage = match.Groups[2].Value;

        // regex out subrhymeSuffixes
        foreach(var suffix in processedSuffixes) {
            var subrhymes = await GetRhyme(site, newRhymePage, rhyme, null);
            subrhymes = subrhymes.Select(x => x + suffix).ToList();
            rhymingWords.AddRange(subrhymes);
        }
    }

    // regex out rhymes in page
    var regex = new Regex("\\*\\s?\\[\\[(.+?)(\\]\\]|\\|)");
    MatchCollection matches = regex.Matches(content);
    foreach (Match match in matches) {
        rhymingWords.Add(match.Groups[1].Value);
    }

    var regex2 = new Regex("\\*\\s?\\{\\{l\\|en\\|(.+?)(\\}\\}|\\|)");
    MatchCollection matches2 = regex2.Matches(content);
    foreach (Match match in matches2) {
        rhymingWords.Add(match.Groups[1].Value);
    }

    var regex3 = new Regex("\\*\\s?\\[\\[w:(.+?)\\|");
    MatchCollection matches3 = regex3.Matches(content);
    foreach (Match match in matches3) {
        rhymingWords.Add(match.Groups[1].Value);
    }

    return rhymingWords;
}

static async Task GetRhymes(List<Word> words) {
    var wordsDict = new Dictionary<string, Word>();
    foreach (string line in File.ReadLines("syllables.csv"))
    { 
        var word = new Word(line);
        wordsDict.Add(word.text, word);
    }

    var client = new WikiClient
    {
        ClientUserAgent = "WCLQuickStart/1.0 (your user name or contact information here)"
    };
    var site = new WikiSite(client, "https://en.wiktionary.org/w/api.php");
    await site.Initialization;


    var pageGen = new AllPagesGenerator(site)
    {
        StartTitle = "English/aɪ",
        NamespaceId = 106,
        PaginationSize = 50
    };

    var rhymepagecount = 0;

    using StreamWriter output = new($"rhymes2.csv", append: false);

    await using (var enumerator = pageGen.EnumPagesAsync(PageQueryOptions.FetchContent).GetAsyncEnumerator())
    {
        while (await enumerator.MoveNextAsync(CancellationToken.None))
        {
            var page = enumerator.Current;
            if (page.Title == "Rhymes:Esperanto/aa") {
                Console.WriteLine("Stopping");
                break;
            }
            Console.WriteLine(page.Title);
            var rhymes = await GetRhyme(site, page.Title, null, page.Content);
            rhymepagecount++;
            Console.WriteLine($"{rhymepagecount}/7599 complete");
            rhymes = rhymes.Select(r => r.ToLower()).Distinct().Where(r => wordsDict.ContainsKey(r)).ToList();
            if (rhymes.Count > 0) {
                var outputLine = String.Join(",", rhymes);
                output.WriteLine(outputLine);
            }            
        }
    }

    return;
}

static async Task DownloadWord() {
    var client = new WikiClient
    {
        ClientUserAgent = "WCLQuickStart/1.0 (your user name or contact information here)"
    };
    var site = new WikiSite(client, "https://en.wiktionary.org/w/api.php");
    await site.Initialization;

    var pageRead = new WikiPage(site, "unidirectional");
    await pageRead.RefreshAsync(PageQueryOptions.FetchContent);
    var pronunciation = GetPronounciation(pageRead);
    var word = new Word(pageRead.ToString(), pronunciation, 5);
    Console.WriteLine(word);
    Console.ReadLine();
}

static async Task DownloadAllWords()
{
    var client = new WikiClient
    {
        ClientUserAgent = "WCLQuickStart/1.0 (your user name or contact information here)"
    };

    var site = new WikiSite(client, "https://en.wiktionary.org/w/api.php");

    await site.Initialization;

    for (int i=1; i<=12; i++) {
        await DownloadWords(site, i);
    }

    await site.LogoutAsync();
    client.Dispose();        // Or you may use `using` statement.
}

static async Task DownloadWords(WikiSite site, int syllableCount) {

    using StreamWriter file = new($"{syllableCount}words.txt", append: true);
    
    var catmembers = new CategoryMembersGenerator(site, $"Category:English_{syllableCount}-syllable_words")
    {
        MemberTypes = CategoryMemberTypes.Page,
        PaginationSize = 50
    };

    await using (var enumerator = catmembers.EnumPagesAsync(PageQueryOptions.FetchContent).GetAsyncEnumerator())
    {
        while (await enumerator.MoveNextAsync(CancellationToken.None))
        {
            var page = enumerator.Current;
            var bannedLetters = new char[]{' ', '-', '@', '.', '$', 'ǀ', 'ǃ'};

            if (page.ToString().IndexOfAny(bannedLetters) != -1) {
                continue;
            }

            var pronunciation = GetPronounciation(page);
            var word = new Word(page.ToString(), pronunciation, syllableCount);

            Console.WriteLine(word);
            await file.WriteLineAsync(word.ToString());
        }
    }
}

public class Word {
    public string? text;
    public string? IPA;
    public int syllableCount;
    public int? primaryStressSyllableIndex;
    public int? secondaryStressSyllableIndex;
    public List<int> rhymeGroups = new List<int>();
    const char primaryStressSymbol = 'ˈ';
    const char secondaryStressSymbol = 'ˌ';

    public Word(){}

    public Word(string text, string IPA, int syllableCount) {
        this.text = text;
        this.IPA = IPA;
        this.syllableCount = syllableCount;
        primaryStressSyllableIndex = GetPrimaryStressSyllableIndex(syllableCount, IPA);
        secondaryStressSyllableIndex = GetSecondaryStressSyllableIndex(syllableCount, IPA);
    }

    public Word(string fileLine) {
        var sections = fileLine.Split(',');
        text = sections[0];
        syllableCount = int.Parse(sections[1]);
        if (sections[2].Length > 0) {
            primaryStressSyllableIndex = int.Parse(sections[2]);
        }
        if (sections[3].Length > 0) {
            secondaryStressSyllableIndex = int.Parse(sections[3]);
        }
    }

    public override string ToString()
    {
        return $"{text},{syllableCount},{primaryStressSyllableIndex},{secondaryStressSyllableIndex}";
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
        Console.WriteLine($"{syllableCount} {characterIndex} {pronunciation} {pronunciation.Length}");
        if (characterIndex == 0) {
            return 0;
        }

        var result = Convert.ToInt32(((double) characterIndex / pronunciation.Length)*syllableCount);
        // it can't be 0
        return Math.Max(1, result);
    }

}