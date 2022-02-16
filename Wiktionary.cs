/*
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
*/