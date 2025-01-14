"use client";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Check, Copy, MoonIcon, SunIcon } from "lucide-react";
import OpenAI from "openai";
import { useState, useEffect } from "react";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const UploadPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [summarySize, setSummarySize] = useState("5-7");
  const [theme, setTheme] = useState("light");

  const handleCopy = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const getAiSummarisation = async (message: string) => {
    if (message.trim() === "") return;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `
              Ti si stručnjak za pravljenje bilješki. Analiziraj sadržaj sljedeće prezentacije i sažmi ga prema sljedećoj strukturi:
              Cilj teme: Jasno navedi glavni cilj ili svrhu teme iz prezentacije. Koristi 1–2 rečenice koje sažimaju suštinu.
              Sažetak: Sažmi ključne tačke prezentacije u ${summarySize} rečenica (5-7 rijeci u recenici maksimalno). Fokusiraj se na najvažnije informacije i ideje.
              Pitanja: Formuliši 3–4 pitanja koja mogu podstaći diskusiju ili pomoći u boljem razumijevanju prezentacije. Pitanja trebaju biti direktno vezana za sadržaj.
              Jasno/Nejasno:
              Jasno: Identificiraj 1–2 koncepta ili dijela koji su jasno objašnjeni i lako razumljivi.
              Nejasno: Identificiraj 1–2 kompleksne ili manje objašnjene tačke koje bi zahtijevale dodatna pojašnjenja.
              Komentari i prijedlozi: Ponudi konstruktivne komentare vezane za stil prezentacije, vizualni prikaz ili tehničke aspekte (npr. formatiranje, čitljivost). Predloži poboljšanja ako je potrebno.
              Format Izlaza:
              Cilj teme: [Tvoj odgovor]
              Sažetak: [Tvoj odgovor]
              Pitanja:
              [Pitanje 1]
              [Pitanje 2]
              [Pitanje 3]
              Jasno:
              [Jasno objašnjen koncept]
              [Jasno objašnjen koncept]
              Nejasno:
              [Nejasno objašnjen koncept]
              [Nejasno objašnjen koncept]
              Komentari i prijedlozi: [Tvoje povratne informacije i prijedlozi]
            `,
          },
          {
            role: "user",
            content: message,
          },
        ],
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error("Failed to get AI message");
      }

      const aiMessage = response.choices[0].message.content;
      return aiMessage || undefined;
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "https://dcs-fastapi-production.up.railway.app/extractContent",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to extract content");
      }

      const data = await response.json();
      const extractedContent = data.content;

      const aiResponse = await getAiSummarisation(extractedContent);
      if (!aiResponse) {
        throw new Error("Failed to get AI summary");
      }
      setSummary(aiResponse as string);
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarySizeChange = (value: string) => {
    if (value) {
      setSummarySize(value);
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, []);

  const handleThemeChange = () => {
    if (theme === "light") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setTheme("light");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="w-full py-4 bg-blue-600 text-white shadow-md relative">
        <div className="container mx-auto flex items-center justify-between px-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-wide">Čola Bilješke AI</h1>
            <p className="text-sm font-medium">Vaš AI asistent za brze sažetke</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleThemeChange}
            className="rounded-full hover:scale-110 transition-transform"
          >
            {theme === "dark" ? <MoonIcon size={24} /> : <SunIcon size={24} />}
          </Button>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 my-4">
        <div className="w-full max-w-lg p-6 bg-background rounded-2xl shadow-lg border border-border">
          <h1 className="text-3xl font-extrabold text-primary text-center mb-4">
            Postavite svoju prezentaciju
          </h1>
          <h2 className="text-xl font-medium text-primary text-center mb-6">
            Dobijte bilješke u nekoliko sekundi
          </h2>

          <input
            disabled={loading}
            type="file"
            accept=".pptx, .pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground 
               file:py-3 file:px-4
               file:rounded-lg file:border-0
               file:text-sm file:font-semibold
               file:bg-blue-100 file:text-blue-600
               hover:file:bg-blue-200 cursor-pointer"
          />
          <div className="w-full space-y-4 mt-4">
            <span className="text-primary">Odaberi velicinu sažetka:</span>
            <ToggleGroup
              type="single"
              value={summarySize}
              onValueChange={handleSummarySizeChange}
            >
              <ToggleGroupItem variant="outline" value="5-7" className={`py-2 h-15 ${summarySize === "5-7" ? "!bg-blue-600 !text-white" : "!bg-background !text-primary"}`}>
                S (5 do 7 rečenica)
              </ToggleGroupItem>
              <ToggleGroupItem variant="outline" value="7-10" className={`py-2 h-15 ${summarySize === "7-10" ? "!bg-blue-600 !text-white" : "!bg-background !text-primary"}`}>
                M (7 do 10 rečenica)
              </ToggleGroupItem>
              <ToggleGroupItem variant="outline" value="10-15" className={`py-2 h-15 ${summarySize === "10-15" ? "!bg-blue-600 !text-white" : "!bg-background !text-primary"}`}>
                L (10 do 15 rečenica)
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Button
            onClick={handleUpload}
            disabled={loading}
            className="mt-6 w-full py-3 px-6 font-semibold"
          >
            {loading ? "Obrada..." : "Dobij bilješke"}
          </Button>

          {summary && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-muted-primary">
                  Bilješke
                </h3>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
                >
                  {!copySuccess ? (
                    <Copy className="w-4 h-4" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              </div>
              <textarea
                className="p-4 bg-muted rounded-lg text-sm text-primary w-full h-[300px] resize-none shadow-inner focus:outline-none border border-border"
                value={summary}
                readOnly
              />
            </div>
          )}
        </div>
      </main>

      <footer className="w-full py-4 bg-gray-800 text-white text-center text-sm">
        <p>© 2025 Čola Bilješke AI. Sva prava zadržana.</p>
        <p>Napravljeno za FSK studente.</p>
      </footer>
    </div>
  );
};

export default UploadPage;
