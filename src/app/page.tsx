"use client";

import OpenAI from "openai";
import { useState } from "react";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const UploadPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

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
              Sažetak: Sažmi ključne tačke prezentacije u 5–7 rečenica (5-7 rijeci u recenici maksimalno). Fokusiraj se na najvažnije informacije i ideje.
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

      // Send file to FastAPI backend
      const response = await fetch("http://127.0.0.1:8000/extractContent", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to extract content");
      }

      const data = await response.json();
      const extractedContent = data.content;

      // Send extracted content to OpenAI for summary
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

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
  <div className="w-full max-w-lg p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
    <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-4">
    Čola Bilješke AI
    </h1>
    <h2 className="text-xl font-medium text-gray-700 text-center mb-6">
      Upload Your Presentation
    </h2>

    <input
      type="file"
      accept=".pptx, .pdf"
      onChange={handleFileChange}
      className="block w-full text-sm text-gray-700 
                 file:py-3 file:px-4
                 file:rounded-lg file:border-0
                 file:text-sm file:font-semibold
                 file:bg-blue-100 file:text-blue-600
                 hover:file:bg-blue-200 cursor-pointer"
    />

    <button
      onClick={handleUpload}
      disabled={loading}
      className={`mt-6 w-full py-3 px-6 text-white font-semibold rounded-xl transition-all 
                  ${
                    loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200"
                  }`}
    >
      {loading ? "Processing..." : "Get Summary"}
    </button>

    {summary && (
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Summary</h3>
        <textarea
          className="p-4 bg-gray-50 rounded-lg text-sm text-gray-900 w-full h-[300px] resize-none shadow-inner focus:outline-none border border-gray-300"
          value={summary}
          readOnly
        />
      </div>
    )}
  </div>
</div>

  );
};

export default UploadPage;
