"use client";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Check,
  ClipboardPen,
  Copy,
  Download,
  Expand,
  MoonIcon,
  NotebookPen,
  NotebookText,
  SunIcon,
  Terminal,
} from "lucide-react";
import OpenAI from "openai";
import { useState, useEffect } from "react";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const UploadPage = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [filenames, setFilenames] = useState<string[]>([]);
  const [summaries, setSummaries] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [summarySize, setSummarySize] = useState("5-7");
  const [minSentences, setMinSentences] = useState("5");
  const [maxSentences, setMaxSentences] = useState("7");
  const [theme, setTheme] = useState("light");
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  useEffect(() => {
    const newFilenames = files.map((file) => file.name);
    setFilenames(newFilenames);
  }, [files]);

  const generateDocx = (summaries: string[]) => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: summaries
            .map((summary, index) => {
              const lines = summary.split("\n").map((line, lineIndex) => {
                if (line.startsWith("cilj teme:")) {
                  return new TextRun({
                    text: line,
                    bold: true,
                    break: lineIndex > 0 ? 1 : 0, // Add a line break before each line except the first
                  });
                } else {
                  return new TextRun({
                    text: line,
                    break: lineIndex > 0 ? 1 : 0, // Add a line break before each line except the first
                  });
                }
              });

              return [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: filenames[index],
                      bold: true,
                      size: 24,
                      break: 1,
                    }),
                  ],
                }),
                new Paragraph({
                  children: lines,
                }),
              ];
            })
            .flat(),
        },
      ],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, "summaries.docx");
    });
  };
  useEffect(() => {
    const summarySizeArray = summarySize.split("-");
    setMinSentences(summarySizeArray[0]);
    setMaxSentences(summarySizeArray[1]);
  }, [summarySize]);

  const handleCopy = (summary: string) => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
    return;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      console.log("Selected files:", newFiles); // Debugging
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    } else {
      console.log("No files selected.");
    }
  };

  useEffect(() => {
    if (files.length > 0) {
      console.log("Files:", files);
    }
  }, [files]);

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
              Sažetak: Sažmi ključne tačke prezentacije u MINIMALNO ${minSentences} i MAKSIMALNO ${maxSentences} rečenica (5-7 rijeci u svakoj recenici). Fokusiraj se na najvažnije informacije i ideje.
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
    if (!files || files.length === 0) return;

    setLoading(true);
    const newSummaries = [];
    try {
      for (const file of files) {
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
        newSummaries.push(aiResponse as string);
      }
      setSummaries(newSummaries);
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
            <h1 className="text-3xl font-extrabold tracking-wide flex items-center justify-center mb-1">
              <NotebookText className="w-8 h-8 mr-2 inline-block" />
              Čola Bilješke AI
            </h1>
            <p className="text-sm font-medium">
              Vaš AI asistent za brze sažetke
            </p>
          </div>

          {theme === "dark" ? (
            <MoonIcon
              onClick={handleThemeChange}
              className="rounded-full hover:scale-110 transition-transform cursor-pointer"
              size={24}
            />
          ) : (
            <SunIcon
              onClick={handleThemeChange}
              className="rounded-full hover:scale-110 transition-transform cursor-pointer"
              size={24}
            />
          )}
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 my-4 relative">
        <div className="w-full max-w-lg p-6 bg-background rounded-2xl shadow-lg border border-border">
          <h1 className="text-3xl font-extrabold text-primary text-center mb-4">
            Postavite svoju prezentaciju
          </h1>
          <h2 className="text-xl font-medium text-primary text-center mb-6">
            Generiši bilješke u nekoliko sekundi
          </h2>

          <input
            disabled={loading}
            multiple
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
          {files.length > 0 && (
            <div>
              <ul className="list-disc list-inside">
                <h3 className="text-lg font-semibold text-muted-primary mt-4">
                  Odabrane datoteke:
                </h3>
                {files.map((file, index) => (
                  <li key={index} className="text-sm text-primary mt-2">
                    {file.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="w-full space-y-4 mt-4">
            <span className="text-primary">Odaberi velicinu sažetka:</span>
            <ToggleGroup
              disabled={loading}
              type="single"
              value={summarySize}
              onValueChange={handleSummarySizeChange}
            >
              <ToggleGroupItem
                variant="outline"
                value="5-7"
                className={`py-2 h-15 ${
                  summarySize === "5-7"
                    ? "!bg-blue-600 !text-white"
                    : "!bg-background !text-primary"
                }`}
              >
                S (5 do 7 rečenica)
              </ToggleGroupItem>
              <ToggleGroupItem
                variant="outline"
                value="7-10"
                className={`py-2 h-15 ${
                  summarySize === "7-10"
                    ? "!bg-blue-600 !text-white"
                    : "!bg-background !text-primary"
                }`}
              >
                M (7 do 10 rečenica)
              </ToggleGroupItem>
              <ToggleGroupItem
                variant="outline"
                value="10-15"
                className={`py-2 h-15 ${
                  summarySize === "10-15"
                    ? "!bg-blue-600 !text-white"
                    : "!bg-background !text-primary"
                }`}
              >
                L (10 do 15 rečenica)
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Button
            onClick={handleUpload}
            disabled={loading}
            className="mt-6 w-full py-3 px-6 font-semibold"
          >
            <NotebookPen className="w-4 h-4 mr-2" />
            {loading ? "Obrada..." : "Generiši bilješke"}
          </Button>
          {loading && (
            <Alert className="mt-2">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Pažnja!</AlertTitle>
              <AlertDescription>
                Ovo može potrajati nekoliko minuta ovisno o broju uploadanovih
                fajlova.
              </AlertDescription>
            </Alert>
          )}

          {summaries.length > 0 && (
            <div
              className={`flex flex-col mt-8 mb-4 ${
                isFullScreen &&
                "!m-0 absolute left-0 right-0 bottom-0 top-0 bg-background rounded-2xl p-6 shadow-lg border border-border z-50 xl:!mx-40"
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-muted-primary">
                  Bilješke
                </h3>
                <button
                  onClick={toggleFullScreen}
                  className="flex items-center gap-1 mb-1 px-3 py-1 text-sm text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
                >
                  <Expand className="w-4 h-4" />
                </button>
              </div>
              <Carousel>
                <CarouselContent>
                  {summaries.map((summary, index) => (
                    <CarouselItem key={index}>
                      <div className={`flex flex-col items-start`}>
                        <button
                          onClick={() => handleCopy(summary)}
                          className="flex items-center gap-1 mb-1 px-3 py-1 text-sm text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
                        >
                          {!copySuccess ? (
                            <Copy className="w-4 h-4" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <textarea
                          key={index}
                          className={`p-4 bg-muted rounded-lg text-sm text-primary w-full h-[300px] resize-none shadow-inner focus:outline-none border border-border mb-4 ${
                            isFullScreen && "h-[550px] !text-lg"
                          }`}
                          value={summary}
                          readOnly
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
              <Button
                className="place-self-center justify-center"
                onClick={() => generateDocx(summaries)}
              >
                <Download className="w-4 h-4" />
                Download Summaries
              </Button>
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
