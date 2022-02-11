using System.Text;
using System.Text.RegularExpressions;
using WikiClientLibrary;
using WikiClientLibrary.Client;
using WikiClientLibrary.Generators;
using WikiClientLibrary.Pages;
using WikiClientLibrary.Sites;

const int maxSyllableCount = 12;

DownloadWord().Wait();
return;
//DownloadAllWords().Wait();
using StreamWriter file = new($"words_simple.txt", append: true);

foreach (string line in File.ReadLines("words.txt"))
{  
    var word = new Word(line);
    await file.WriteLineAsync(word.ToString());
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