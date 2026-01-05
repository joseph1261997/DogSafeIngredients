import { BrowserMultiFormatReader } from "https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm";

const video = document.getElementById("video");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const searchBtn = document.getElementById("searchBtn");
const codeInput = document.getElementById("codeInput");

const statusEl = document.getElementById("status");
const codeOut = document.getElementById("codeOut");
const nameOut = document.getElementById("nameOut");
const ingOut = document.getElementById("ingOut");
const verdictOut = document.getElementById("verdictOut");
const reasonsUl = document.getElementById("reasons");

const reader = new BrowserMultiFormatReader();

const DANGEROUS = [
    { verdict: "NO", label: "Xilitolo", terms: ["xilitolo", "xylitol"] },
    { verdict: "NO", label: "Cipolla", terms: ["cipolla", "onion", "onion powder"] },
    { verdict: "NO", label: "Aglio", terms: ["aglio", "garlic", "garlic powder"] },
    { verdict: "NO", label: "Porro/Erba cipollina", terms: ["porro", "leek", "chives", "erba cipollina"] },
    { verdict: "NO", label: "Uva/Uvetta", terms: ["uva", "grape", "uvetta", "raisins", "sultanas", "currants"] },
    { verdict: "NO", label: "Cioccolato/Cacao", terms: ["cioccolato", "chocolate", "cacao", "cocoa"] },
    { verdict: "NO", label: "Macadamia", terms: ["macadamia"] },
    { verdict: "NO", label: "Alcol", terms: ["alcool", "alcohol", "etanolo", "ethanol"] },

    { verdict: "ATTENZIONE", label: "Caffeina", terms: ["caffeina", "caffeine", "coffee", "tea", "guarana", "guaranà"] },
    { verdict: "ATTENZIONE", label: "Dolcificanti non specificati", terms: ["dolcificante", "sweetener"] },
    { verdict: "ATTENZIONE", label: "Spezie piccanti", terms: ["peperoncino", "chili", "capsaicina", "capsaicin"] },
    { verdict: "ATTENZIONE", label: "Noce moscata", terms: ["noce moscata", "nutmeg"] },
];

function normalize(s) {
    return (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^\p{Letter}\p{Number}\s]/gu, " ");
}

function evaluate(ingredientsText) {
    const t = normalize(ingredientsText);
    if (!t.trim()) {
        return { verdict: "SCONOSCIUTO", reasons: ["Ingredienti non disponibili nel database del prodotto."] };
    }

    const hits = [];
    for (const rule of DANGEROUS) {
        for (const term of rule.terms) {
            const nt = normalize(term);
            if (t.includes(nt)) {
                hits.push({ verdict: rule.verdict, msg: `Rilevato: ${rule.label} (“${term}”)` });
                break;
            }
        }
    }

    const hasNO = hits.some(h => h.verdict === "NO");
    if (hasNO) return { verdict: "NO", reasons: hits.filter(h => h.verdict === "NO").map(h => h.msg) };

    const hasWARN = hits.some(h => h.verdict === "ATTENZIONE");
    if (hasWARN) return { verdict: "ATTENZIONE", reasons: hits.filter(h => h.verdict === "ATTENZIONE").map(h => h.msg) };

    return { verdict: "OK", reasons: ["Nessun ingrediente critico rilevato (controllo base)."] };
}

function setVerdict(v) {
    verdictOut.textContent = v;
    verdictOut.className = "badge " + v;
}

function setReasons(list) {
    reasonsUl.innerHTML = "";
    for (const r of list) {
        const li = document.createElement("li");
        li.textContent = r;
        reasonsUl.appendChild(li);
    }
}

async function fetchProduct(barcode) {
    // Richiedi esplicitamente ingredienti IT + fallback generico
    const fields = [
        "product_name",
        "product_name_it",
        "ingredients_text_it",
        "ingredients_text",
        "lang"
    ].join(",");

    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${encodeURIComponent(fields)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Errore API");
    return res.json();
}

async function analyzeBarcode(barcode) {
    statusEl.textContent = "Cerco prodotto...";
    codeOut.textContent = barcode;
    nameOut.textContent = "—";
    ingOut.textContent = "—";
    setVerdict("—");
    setReasons([]);

    try {
        const data = await fetchProduct(barcode);

        if (!data || data.status !== 1 || !data.product) {
            statusEl.textContent = "Prodotto non trovato.";
            setVerdict("SCONOSCIUTO");
            setReasons(["Nessun dato disponibile per questo codice."]);
            return;
        }

        const p = data.product;
        const name = p.product_name_it || p.product_name || "Nome non disponibile";
        const ing = p.ingredients_text_it || p.ingredients_text || "";

        nameOut.textContent = name;
        ingOut.textContent = ing ? ing : "(non disponibile)";

        const ev = evaluate(ing);
        setVerdict(ev.verdict);
        setReasons(ev.reasons);

        statusEl.textContent = `Analisi completata. (lang prodotto: ${p.lang || "n/d"})`;
    } catch (e) {
        statusEl.textContent = "Errore durante la ricerca.";
        setVerdict("SCONOSCIUTO");
        setReasons(["Impossibile contattare il servizio o risposta non valida."]);
    }
}

// Scansione
let scanning = false;

startBtn.addEventListener("click", async () => {
    if (scanning) return;
    scanning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusEl.textContent = "Avvio fotocamera...";

    try {
        await reader.decodeFromVideoDevice(undefined, video, (result, err) => {
            if (result) {
                const text = result.getText();
                scanning = false;
                reader.reset();
                startBtn.disabled = false;
                stopBtn.disabled = true;
                statusEl.textContent = `Codice letto: ${text}`;
                codeInput.value = text;
                analyzeBarcode(text);
            }
        });
    } catch {
        scanning = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        statusEl.textContent = "Impossibile usare la fotocamera (permessi/HTTPS).";
    }
});

stopBtn.addEventListener("click", () => {
    reader.reset();
    scanning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusEl.textContent = "Scansione fermata.";
});

// Ricerca manuale
searchBtn.addEventListener("click", () => {
    const v = (codeInput.value || "").trim();
    if (!v) return;
    analyzeBarcode(v);
});