// See https://aka.ms/new-console-template for more information
Console.WriteLine("Hello, World!");

var word = new Word();

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