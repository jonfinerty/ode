using System.Text;
using System.Text.RegularExpressions;
using WikiClientLibrary;
using WikiClientLibrary.Client;
using WikiClientLibrary.Generators;
using WikiClientLibrary.Pages;
using WikiClientLibrary.Sites;

const int maxSyllableCount = 12;

//DownloadWord().Wait();
//var words = loadWords();
//GetRhymes(words).Wait();
processRhymes();
assignRhymeGroups();
return;
//DownloadAllWords().Wait();

static void processRhymes() {
    List<List<string>> rhymeGroups = new List<List<string>>();
    foreach (string line in File.ReadLines("rhymes.txt"))
    {  
        var group = line.Split(", ").Select(w => w.ToLower()).Distinct().ToList();
        if (group.Count() > 1) {
            group.Sort();
            rhymeGroups.Add(group);
            //Console.WriteLine(String.Join(", ",group));
        }
    }  

    var distinct = rhymeGroups.Select(g => String.Join(",",g)).Distinct().ToList();
    distinct.Sort();
    // todo: remove ones which are proper suffixes of others
    distinct = distinct.Where(d => !distinct.Any(superset => superset.Contains(d) && superset != d)).ToList();

    rhymeGroups = distinct.Select(g => g.Split(",").ToList()).ToList();
    using StreamWriter output = new($"rhymes_processed2.txt", append: true);

    foreach (var group in rhymeGroups)
    {  
        var line = String.Join(", ",group);
        output.WriteLine(line);
    }  
}

static void assignRhymeGroups() {
    var rhymeIndex = 0;
    var words = loadWords();
    foreach (string rhyme in File.ReadLines("rhymes_processed2.txt"))
    {  
        var rhymeWords = rhyme.Split(", ").ToList();
        foreach(string rhymingWord in rhymeWords) {
            var word = words.FirstOrDefault(w => w.text.ToLower() == rhymingWord);
            if (word != null){
                word.rhymeGroups.Add(rhymeIndex);
            }
        }

        rhymeIndex++;
    }  

    foreach(var word in words) {
        Console.WriteLine(word.text + " " + String.Join(",", word.rhymeGroups));
    }

    using StreamWriter output2 = new($"rhymes_processed3.txt", append: true);
    foreach (string line in File.ReadLines("web/js/words.js"))
    {
        var parts = line.Split(":");
        var word = parts[0].Replace("\"","");
        var props = parts[1].Substring(0,parts[1].Length-2);
        var wordData = words.FirstOrDefault(w => w.text.ToLower() == word);
        if (wordData != null && wordData.rhymeGroups.Count() > 0) {
            props = props + ",[" + String.Join(",", wordData.rhymeGroups) + "]],"; 
        } else {
            props = props + "],";
        }
        output2.WriteLine("\"" + word + "\":" + props);
    }
}

static List<Word> loadWords() {
    var words = new List<Word>();
    foreach (string line in File.ReadLines("words.txt"))
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

static async Task<List<string>> GetRhyme(WikiSite site, string rhyme, string previousRhymePage) {
    var rhymingWords = new List<string>();
    var pageRead = new WikiPage(site, "Rhymes:English/"+rhyme);
    await pageRead.RefreshAsync(PageQueryOptions.FetchContent);

    var content = pageRead.Content;
    if (content == null) {
        return rhymingWords;
    }

    var redirect = new Regex("\\#REDIRECT \\[\\[Rhymes:English/(.+?)\\]\\]");
    var redirectMatches = redirect.Matches(content);
    var firstMatch = redirectMatches.FirstOrDefault();
    if (firstMatch != null) { 
        return await GetRhyme(site, firstMatch.Groups[1].Value, rhyme);
    }

    var seeAlso = new Regex("\\# See also \\[\\[Rhymes:English/(.+?)\\|");
    MatchCollection seeAlsoMatches = seeAlso.Matches(content);
    foreach (Match match in seeAlsoMatches) {
        var newRhymePage = match.Groups[1].Value;
        if (previousRhymePage == newRhymePage) {
            continue;
        }
        var subrhymes = await GetRhyme(site, newRhymePage, rhyme);
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
            var subrhymes = await GetRhyme(site, newRhymePage, rhyme);
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
    var client = new WikiClient
    {
        ClientUserAgent = "WCLQuickStart/1.0 (your user name or contact information here)"
    };
    var site = new WikiSite(client, "https://en.wiktionary.org/w/api.php");
    await site.Initialization;

    var catmembers = new CategoryMembersGenerator(site, $"Category:English_rhymes")
    {
        MemberTypes = CategoryMemberTypes.Page,
        PaginationSize = 50
    };

    using StreamWriter file = new($"rhymes.txt", append: true);

    await using (var enumerator = catmembers.EnumPagesAsync(PageQueryOptions.FetchContent).GetAsyncEnumerator())
    {
        await enumerator.MoveNextAsync(CancellationToken.None); //skip introduction
        while (await enumerator.MoveNextAsync(CancellationToken.None))
        {
            var page = enumerator.Current;
            //Console.WriteLine(page.Content);
            //[[Rhymes:English/a??ni|
            var regex = new Regex("Rhymes:English/(.+?)\\|");
            MatchCollection matches = regex.Matches(page.Content);
            foreach (Match match in matches) {
                // we are now in a distinct rhyme.
                var rhymingWords = await GetRhyme(site, match.Groups[1].Value, null);
                rhymingWords = rhymingWords.Where(w => words.Any(validWord => validWord.text == w)).Distinct().ToList();    
                if (rhymingWords.Count >0 ){
                    var line = String.Join(", ",rhymingWords);
                    Console.WriteLine(line);
                    await file.WriteLineAsync(line);
                }
            }
        }
    }
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
    public string text;
    public string? IPA;
    public int syllableCount;
    public int? primaryStressSyllableIndex;
    public int? secondaryStressSyllableIndex;
    public List<int> rhymeGroups = new List<int>();
    const char primaryStressSymbol = 'ˈ';
    const char secondaryStressSymbol = 'ˌ';

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
        IPA = sections[1];
        syllableCount = int.Parse(sections[2]);
        if (sections[3].Length > 0) {
            primaryStressSyllableIndex = int.Parse(sections[3]);
        }
        if (sections[4].Length > 0) {
            secondaryStressSyllableIndex = int.Parse(sections[4]);
        }
    }

    public override string ToString()
    {
        // var stressedSyllable = '-';//'●';
        // var unstressedSyllable = '/';//'○';
        // var sb = new StringBuilder();
        // for (int i=0; i<syllableCount; i++) {
        //     if (i!= 0) {
        //         sb.Append(' ');
        //     }
        //     if (i == primaryStressSyllableIndex || i == secondaryStressSyllableIndex) {
        //         sb.Append(stressedSyllable);
        //     } else {
        //         sb.Append(unstressedSyllable);
        //     }
        // }

        // var padding = Math.Max(0, ((text.Length - sb.Length) / 2));

        // return new String(' ', padding) + sb.ToString() + '\n' + text;
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