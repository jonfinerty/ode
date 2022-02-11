using System.Text;
using System.Text.RegularExpressions;
using WikiClientLibrary;
using WikiClientLibrary.Client;
using WikiClientLibrary.Generators;
using WikiClientLibrary.Pages;
using WikiClientLibrary.Sites;

const int maxSyllableCount = 12;

Console.WriteLine("Hello, World!");

MainAsync().Wait();

static string GetPronounciation(WikiPage page) {
    // extract pronounciation
    // grabs the first pronounciation, could improve by preferring the UK once, dealing with read and wind etc.
    var regex = new Regex("\\{\\{IPA\\|en\\|/(.+?)/");
    var matches = regex.Matches(page.Content);
    var firstMatch = matches.FirstOrDefault();
    if (firstMatch != null) {
        return firstMatch.Groups[1].Value;
    } else {
        return null;
    }
}

static async Task MainAsync()
{
    // A WikiClient has its own CookieContainer.
    var client = new WikiClient
    {
        ClientUserAgent = "WCLQuickStart/1.0 (your user name or contact information here)"
    };

    // You can create multiple WikiSite instances on the same WikiClient to share the state.
    var site = new WikiSite(client, "https://en.wiktionary.org/w/api.php");



    // Wait for initialization to complete.
    // Throws error if any.
    await site.Initialization;

    // var pageRead = new WikiPage(site, "acanthad");
    // await pageRead.RefreshAsync(PageQueryOptions.FetchContent);
    // Console.WriteLine();
    // Console.WriteLine(pageRead.Content);
    // Console.ReadLine();

    for (int i=1; i<=12; i++) {
        await DownloadWords(site, i);
    }

    // try
    // {
    //     await site.LoginAsync("User name", "password");
    // }
    // catch (WikiClientException ex)
    // {
    //     Console.WriteLine(ex.Message);
    //     // Add your exception handler for failed login attempt.
    // }

    // // Do what you want
    // Console.WriteLine(site.SiteInfo.SiteName);
    // Console.WriteLine(site.AccountInfo);
    // Console.WriteLine("{0} extensions", site.Extensions.Count);
    // Console.WriteLine("{0} interwikis", site.InterwikiMap.Count);
    // Console.WriteLine("{0} namespaces", site.Namespaces.Count);

    // We're done here
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
        return $"{text},{IPA},{syllableCount},{primaryStressSyllableIndex},{secondaryStressSyllableIndex}";
    }

    public string Serialise() {
        return $"{text},{IPA},{syllableCount},{primaryStressSyllableIndex},{secondaryStressSyllableIndex}";
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
        if (characterIndex == 0) {
            return 0;
        }

        var result = Convert.ToInt32(((double) characterIndex / pronunciation.Length)*syllableCount);
        // it can't be 0
        return Math.Max(1, result);
    }

}