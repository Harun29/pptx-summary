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
  Copy,
  Download,
  Expand,
  LoaderCircle,
  Minimize,
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
import { Progress } from "@/components/ui/progress";

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
  const [progress, setProgress] = useState<number>(0);
  const [filesDone, setFilesDone] = useState<number>(0);
  const [subject, setSubject] = useState<"default" | "scrum">("default");
  const [continueLoading, setContinueLoading] = useState(false);

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

  const getAiSummarisation = async (message: string, source?: string) => {
    if (message.trim() === "") return;

    let prompt = "";
    if (subject === "scrum") {
      prompt = `
    Ti si stručnjak za SCRUM. Na osnovu sadržaja izvora i/ili relevantnih provjerenih izvora (npr. Google, službena dokumentacija), kreiraj SCRUM kviz prema sljedećim tematskim cjelinama:
    1. Agilni razvoj
    2. Agilni vs tradicionalni razvoj
    3. SCRUM uloge
    4. SCRUM artefakti
    5. SCRUM ceremonije
    6. SCRUM procesi i tehnike
    7. SCRUM KPI i metrike
    8. SCRUM alati
    9. Skaliranje SCRUM-a
    10. Integracija SCRUM-a s drugim metodologijama

    Za svaku tematsku cjelinu:
    - Napiši kratak sažetak (3–5 rečenica, 5–7 riječi po rečenici).
    - Formuliši najmanje 7 pitanja različite kompleksnosti sa tačnim odgovorima.
    - Svako pitanje i odgovor mora imati referencu:
      - Ako koristiš izvor sa Google-a ili interneta, navedi tačan naziv izvora (naslov članka, vodiča, knjige ili link).
      - Ako koristiš dokument koji sam ti poslao, navedi otprilike naslov i stranicu iz tog dokumenta (npr. "[Naziv prezentacije, str. 12]").
    - Na kraju navedi sve reference korištene za pripremu kviza.

    Formatiraj odgovor ovako:

    1. [Naziv cjeline]
    Sažetak: [Tvoj sažetak]
    Pitanja:
    - Pitanje 1 [referenca]
      Odgovor: [odgovor] [referenca]
    - Pitanje 2 [referenca]
      Odgovor: [odgovor] [referenca]
    ...

    Reference: [lista svih korištenih referenci sa tačnim nazivima ili stranicama]

    Ignoriši ograničenja vezana za vrijeme ili dužinu odgovora. Uvijek generiši kompletan kviz za svih 10 tematskih cjelina u jednom odgovoru, bez obzira na dužinu ili kompleksnost zadatka.
      `;
    } else {
      prompt = `
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
      `;
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: prompt,
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
    setProgress(0);
    setFilesDone(0);
    const newSummaries = [];
    const totalFiles = files.length;

    try {
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
          "http://localhost:8000/extractContent",
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

        const aiResponse = await getAiSummarisation(extractedContent, filenames[i]);
        if (!aiResponse) {
          throw new Error("Failed to get AI summary");
        }
        newSummaries.push(aiResponse as string);

        // Update progress
        setFilesDone((prevFilesDone) => prevFilesDone + 1);
        setProgress(((i + 1) / totalFiles) * 100);
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

  const handleContinue = async () => {
    setContinueLoading(true);
    try {
      const lastSummary = summaries[summaries.length - 1];
      const aiResponse = await getAiSummarisation("Nastavi gdje si stao.", filenames[filenames.length - 1]);
      if (aiResponse) {
        // Spoji nastavak na zadnji summary
        setSummaries((prev) => {
          const newArr = [...prev];
          newArr[newArr.length - 1] = lastSummary + "\n\n" + aiResponse;
          return newArr;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setContinueLoading(false);
    }
  };

  return (
    <div
      className={`h-screen flex flex-col ${
        subject === "scrum"
          ? "bg-background" // Light yellow background for SCRUM
          : "bg-background"
      }`}
    >
      <header
        className={`w-full py-4 shadow-md relative ${
          subject === "scrum"
            ? "bg-yellow-400 text-gray-900" // Yellow header for SCRUM
            : "bg-blue-600 text-white"
        }`}
      >
        <div className="container mx-auto flex items-center justify-between px-6">
          <div>
            <h1 className={`text-3xl font-extrabold tracking-wide flex items-center justify-center mb-1 ${
              subject === "scrum" ? "text-gray-900" : ""
            }`}>
              <NotebookText className="w-8 h-8 mr-2 inline-block" />
              Bilješke AI
            </h1>
            <p className={`text-sm font-medium ${
              subject === "scrum" ? "text-gray-800" : ""
            }`}>
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
        <div
          className={`w-full max-w-lg p-6 rounded-2xl shadow-lg border border-border ${
            subject === "scrum"
              ? "bg-background border-yellow-300"
              : "bg-background"
          } ${
            summaries.length > 0 &&
            "md:grid md:grid-cols-2 md:gap-10 md:max-w-5xl h-full"
          }`}
        >
          <div>
            <h1 className={`text-3xl font-extrabold text-center mb-4 ${
              subject === "scrum" ? "text-yellow-700" : "text-primary"
            }`}>
              Generiši bilješke u nekoliko sekundi
            </h1>
            <h2 className={`text-xl font-medium text-center mb-6 ${
              subject === "scrum" ? "text-yellow-800" : "text-primary"
            }`}>
              Postavite svoje prezentacije (.pptx, .pdf)
            </h2>
            <div className="flex justify-center mb-4">
              <Button
                variant={subject === "default" ? "default" : "outline"}
                className="mr-2"
                onClick={() => setSubject("default")}
              >
                Bilješke
              </Button>
              <Button
                variant={subject === "scrum" ? "default" : "outline"}
                onClick={() => setSubject("scrum")}
                style={{
                  backgroundColor: subject === "scrum" ? "#fbbf24" : undefined,
                  color: subject === "scrum" ? "#78350f" : undefined,
                  borderColor: subject === "scrum" ? "#fbbf24" : undefined,
                }}
              >
                ISMO Prisustvo
              </Button>
            </div>

            <div className="mb-4">
              {subject === "default" ? (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-3 text-sm">
                  <b>Uputstvo:</b> Dodajte sve prezentacije (.pptx ili .pdf), izaberite veličinu sažetka i kliknite na "Generiši bilješke". Alat će automatski kreirati sažetak, pitanja i komentare na osnovu sadržaja prezentacije.
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-md p-3 text-sm">
                  <b>Uputstvo:</b> Dodajte SCRUM materijal (.pptx ili .pdf), kliknite na "Generiši bilješke". Alat će automatski generisati kviz sa pitanjima i odgovorima po tematskim cjelinama, koristeći prave reference iz materijala ili relevantne izvore sa interneta.
                </div>
              )}
            </div>

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
                  <h3 className="text-lg font-semibold text-muted-primary mt-4">
                    Odabrane datoteke:
                  </h3>
                  <div className="max-h-52 overflow-y-auto">
                  {files.map((file, index) => (
                    <div key={index} className="text-sm text-primary mt-2 border-2 border-blue-500 p-1 rounded-xl text-blue-500">
                      {file.name.substring(0,70)}
                      {file.name.length > 70 && "..."}
                    </div>
                  ))}
                  </div>
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
              {!loading ? <NotebookPen className="w-4 h-4 mr-2" />
            : <LoaderCircle className="animate-spin w-4 h-4 mr-2" />  
            }
              {loading ? "Obrada..." : "Generiši bilješke"}
            </Button>
            {loading &&
            <div className="mt-4 flex flex-col text-muted-foreground text-sm">
              <span>{filesDone}/{files.length} bilješki obrađeno</span>
              <Progress value={progress} />
            </div> 
            }
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
          </div>

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
                  {!isFullScreen ? (
                    <Expand className="w-4 h-4" />
                  ) : (
                    <Minimize className="w-4 h-4" />
                  )}
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
                          className={`p-4 bg-muted rounded-lg text-sm text-primary w-full h-[550px] resize-none shadow-inner focus:outline-none border border-border mb-4 ${
                            isFullScreen && "!text-lg"
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
                Preuzmi bilješke u wordu
              </Button>
              {subject === "scrum" &&
                summaries.length > 0 &&
                /nastavak\s+slijedi|nastavi/i.test(summaries[summaries.length - 1]) && (
                  <Button
                    className="mt-4"
                    onClick={handleContinue}
                    disabled={continueLoading}
                  >
                    {continueLoading ? <LoaderCircle className="animate-spin w-4 h-4 mr-2" /> : <NotebookPen className="w-4 h-4 mr-2" />}
                    Nastavi gdje je stao
                  </Button>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="w-full py-4 bg-gray-800 text-white text-center text-sm">
        <p>© 2025 Bilješke AI. Sva prava zadržana.</p>
        <p>Napravljeno za FSK studente.</p>
      </footer>
    </div>
  );
};

export default UploadPage;
