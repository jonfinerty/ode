// See https://aka.ms/new-console-template for more information
using System.Text.RegularExpressions;
using WikiClientLibrary;
using WikiClientLibrary.Client;
using WikiClientLibrary.Generators;
using WikiClientLibrary.Pages;
using WikiClientLibrary.Sites;

const int maxSyllableCount = 12;
char[] bannedLetters = new char[]{' ', '-', '@', '.', '$'};

Console.WriteLine("Hello, World!");

MainAsync().Wait();

static async Task GetPronounciation(WikiPage page) {
    if (page.Content.Length == 0) {
        await page.RefreshAsync(PageQueryOptions.FetchContent);
    }
    
    // extract pronounciation
    // grabs the first pronounciation, could improve by preferring the UK once
    var regex = new Regex("\\{\\{IPA\\|en\\|(.+)\\}\\}");
    var matches = regex.Matches(page.Content);
    var firstMatch = matches.FirstOrDefault();
    if (firstMatch != null) {
        Console.WriteLine($"    pronounctiation: {firstMatch.Groups[1].Value}");
    } else {
        Console.WriteLine();
    }
}

const char primaryStressSymbol = 'ˈ';
const char secondaryStressSymbol = 'ˌ';

// return list of stressed syllable indexes?
static void GetStressedSyllablesEstimation(int syllableCount, string pronunciation) {
    // if starts with ' then first
    var primaryStressSyllableIndex = GetPrimaryStressSyllableIndex(int syllableCount, string pronunciation);
    var secondaryStressSyllableIndex = GetSecondaryStressSyllableIndex(int syllableCount, string pronunciation);
}

static int? GetPrimaryStressSyllableIndex(int syllableCount, string pronunciation) {
    var characterIndex = pronunciation.IndexOf(primaryStressSymbol);
    if (characterIndex == -1) {
        return null;
    }

    return EstimateSyllableIndex(syllableCount, pronunciation, characterIndex);
}

static int EstimateSyllableIndex(int syllableCount, string pronunciation, int characterIndex) {
    if (characterIndex == 0) {
        return 0;
    }

    // count 4, 
    // ɪnˈsænɪti
    // 3
    var result = Convert.ToInt32((((double) characterIndex / pronunciation.Length)*syllableCount);
    // it can't be 0
    return Math.Max(1, result);
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
    // List the first 10 subcategories in Category:Cats
    Console.WriteLine();
    Console.WriteLine("3 Syllable Words");
    var catmembers = new CategoryMembersGenerator(site, "Category:English_3-syllable_words")
    {
        MemberTypes = CategoryMemberTypes.Page,
        PaginationSize = 50
    };

    // You can specify EnumPagesAsync(PageQueryOptions.FetchContent),
    // if you are interested in the content of each page
    await using (var enumerator = catmembers.EnumPagesAsync().GetAsyncEnumerator())
    {
        int index = 0;
        // Before the advent of "async for" (might be introduced in C# 8),
        // to handle the items in sequence one by one, we need to use
        // the expanded for-each pattern.
        while (await enumerator.MoveNextAsync(CancellationToken.None))
        {
            var page = enumerator.Current;
            await page.RefreshAsync(PageQueryOptions.FetchContent);
            Console.Write("{0,-6}: {1,-32}", index, page);

            //extract pronounciation
            await GetPronounciation(page);
            //extract hypenation
            //Console.WriteLine(page.Content);

            index++;
            // Prompt user to continue listing, every 50 pages.
            if (index % 50 == 0)
            {
                Console.WriteLine("Esc to exit, any other key for next page.");
                if(Console.ReadKey().Key == ConsoleKey.Escape)
                    break;
            }
        }
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




public class Word {
    public List<Syllable> syllables;
}

public class Syllable {
    public string text;
    public bool isStressed;

    public override string ToString()
    {
        return isStressed ? text.ToUpper() : text;
    }
}