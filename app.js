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

/**
 * Regole su ingredienti (ingredients_text_*)
 * verdict: "NO" = evitare; "ATTENZIONE" = dipende da quantità/contesto/preparazione
 */
const INGREDIENT_RULES = [
  // --- NO (da evitare) ---
  { verdict: "NO", label: "Xilitolo", terms: ["xilitolo", "xylitol", "e967", "e 967", "birch sugar", "zucchero di betulla"] },

  { verdict: "NO", label: "Cipolla (Allium)", terms: ["cipolla", "onion", "onion powder", "cipolla in polvere", "cipolla disidratata", "dehydrated onion", "shallot", "scalogno"] },
  { verdict: "NO", label: "Aglio (Allium)", terms: ["aglio", "garlic", "garlic powder", "aglio in polvere", "garlic extract", "estratto di aglio"] },
  { verdict: "NO", label: "Porro", terms: ["porro", "porri", "leek", "leeks"] },
  { verdict: "NO", label: "Erba cipollina", terms: ["erba cipollina", "chives", "chive"] },

  { verdict: "NO", label: "Uva / Uvetta", terms: ["uva", "grape", "grapes", "uvetta", "uva passa", "raisins", "raisin", "sultana", "sultanas", "currants"] },

  { verdict: "NO", label: "Cioccolato / Cacao / Teobromina", terms: ["cioccolato", "chocolate", "cacao", "cocoa", "theobromine", "teobromina"] },

  { verdict: "NO", label: "Macadamia", terms: ["macadamia", "macadamia nuts", "noce di macadamia", "noci di macadamia"] },

  { verdict: "NO", label: "Alcol (etanolo)", terms: ["alcol", "alcool", "ethanol", "ethyl alcohol", "etanolo", "alcohol"] },

  { verdict: "NO", label: "Luppolo", terms: ["luppolo", "hops", "hop", "hop extract", "estratto di luppolo"] },

  // Snack salati: come ingrediente può comparire in “mix aperitivo”, ecc.
  { verdict: "NO", label: "Patatine / chips (snack salati)", terms: ["patatine", "chips", "crisps", "tortilla chips", "corn chips", "nachos"] },

  // --- ATTENZIONE (dose/contesto) ---
  { verdict: "ATTENZIONE", label: "Caffeina", terms: ["caffeina", "caffeine", "coffee", "caffè", "caffe", "tea", "tè", "te", "guarana", "guaranà", "yerba mate", "mate", "kola", "cola"] },

  // dolcificanti generici: flag per verifica (soprattutto se ingredienti incompleti)
  { verdict: "ATTENZIONE", label: "Dolcificanti (generico)", terms: ["dolcificante", "dolcificanti", "edulcorante", "edulcoranti", "sweetener", "sweeteners", "polyols", "polioli"] },

  { verdict: "ATTENZIONE", label: "Spezie piccanti / Capsaicina", terms: ["peperoncino", "chili", "chilli", "cayenne", "capsaicina", "capsaicin", "hot sauce", "salsa piccante", "jalapeno", "jalapeño", "habanero"] },

  { verdict: "ATTENZIONE", label: "Noce moscata", terms: ["noce moscata", "nutmeg", "mace", "macis"] },

  { verdict: "ATTENZIONE", label: "Sale / sodio elevato", terms: ["sale", "salt", "sodium", "cloruro di sodio", "sodium chloride", "salamoia", "brine"] },

  { verdict: "ATTENZIONE", label: "Insaccati / carni processate", terms: ["salame", "salami", "prosciutto", "ham", "bacon", "pancetta", "salsiccia", "sausage", "wurstel", "hot dog", "cured meat", "processed meat"] },

  { verdict: "ATTENZIONE", label: "Avocado", terms: ["avocado", "olio di avocado", "avocado oil"] },

  { verdict: "ATTENZIONE", label: "Solanacee (crudo/verde)", terms: [
      "patata cruda", "raw potato", "patata verde", "green potato", "germogli di patata", "potato sprouts",
      "pomodoro verde", "green tomato", "pomodoro crudo", "raw tomato",
      "melanzana", "eggplant", "aubergine"
    ]
  },

  { verdict: "ATTENZIONE", label: "Fave", terms: ["fave", "fava", "fava beans", "broad beans"] },

  { verdict: "ATTENZIONE", label: "Cavoli / crucifere", terms: ["cavolo", "cavoli", "cabbage", "broccoli", "cavolfiore", "cauliflower", "kale", "cavolo nero", "brussels sprouts", "cavoletti di bruxelles"] },

  { verdict: "ATTENZIONE", label: "Fegato", terms: ["fegato", "liver", "liver pate", "paté di fegato", "pate di fegato"] },

  { verdict: "ATTENZIONE", label: "Carne/pesce/uova crudi", terms: ["carne cruda", "raw meat", "pesce crudo", "raw fish", "uova crude", "raw egg", "sashimi", "tartare", "carpaccio", "ceviche"] },

  { verdict: "ATTENZIONE", label: "Agrumi", terms: [
      "limone", "lemon", "lime", "pompelmo", "grapefruit",
      "succo di limone", "lemon juice", "succo di lime", "lime juice", "succo di pompelmo", "grapefruit juice",
      "scorza di limone", "lemon peel", "lemon zest", "olio essenziale di limone", "lemon essential oil"
    ]
  },

  { verdict: "ATTENZIONE", label: "Noci", terms: ["nuts", "nut", "noci", "noce", "hazelnut", "nocciole", "almond", "mandorle", "cashew", "anacardi", "pecan", "pistachio", "pistacchi", "pine nuts", "pinoli"] },

  { verdict: "ATTENZIONE", label: "Rabarbaro (foglie)", terms: ["rhubarb leaf", "rhubarb leaves", "foglie di rabarbaro", "rabarbaro", "foglia di rabarbaro"] },
];

/**
 * Regole su nome prodotto (product_name) e categorie.
 * Sono più “grezze” e servono come fallback se mancano ingredienti.
 */
const PRODUCT_RULES = [
  // NO
  { verdict: "NO", label: "Cioccolato", terms: ["cioccolato", "chocolate", "cocoa"] },
  { verdict: "NO", label: "Sugar-free (possibile xilitolo)", terms: ["sugar free", "senza zucchero", "chewing gum", "gomma da masticare", "gum"] },
  { verdict: "NO", label: "Patatine/chips", terms: ["patatine", "chips", "crisps", "nachos"] },
  { verdict: "NO", label: "Alcol", terms: ["alcol", "alcool", "ethanol", "ethyl alcohol", "etanolo", "alcohol", "alcolico", "alcolica", "alcoliche", "alcolici"] },

  // ATTENZIONE
  { verdict: "ATTENZIONE", label: "Snack salati / aperitivo", terms: ["snack", "salatini", "aperitivo", "party mix", "mix aperitivo"] },
  { verdict: "ATTENZIONE", label: "Insaccati / salumi", terms: ["salame", "prosciutto", "mortadella", "bacon", "pancetta", "salsiccia", "wurstel", "hot dog", "sausage"] },
  { verdict: "ATTENZIONE", label: "Energy drink / caffè", terms: ["energy", "energy drink", "bevanda energetica", "caffè", "coffee"] },
];

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Match "parola intera": il termine deve essere delimitato da inizio/fine stringa o spazi
function hasWholeTerm(normalizedHaystack, normalizedNeedle) {
  const term = (normalizedNeedle || "").trim();
  if (!term) return false;
  const re = new RegExp(`(?:^|\\s)${escapeRegExp(term)}(?:\\s|$)`, "i");
  return re.test(normalizedHaystack);
}

function findHits(text, rules, originLabel) {
  const t = normalize(text);
  if (!t.trim()) return [];

  const hits = [];
  for (const rule of rules) {
    for (const term of rule.terms) {
      const nt = normalize(term);
      if (!nt) continue;

      if (hasWholeTerm(t, nt)) {
        hits.push({
          verdict: rule.verdict,
          msg: `Rilevato in ${originLabel}: ${rule.label} (termine: “${term}”)`
        });
        break;
      }
    }
  }
  return hits;
}

function evaluateProduct({ ingredientsText, productName, categoriesText }) {
  const hits = [
    ...findHits(ingredientsText, INGREDIENT_RULES, "ingredienti"),
    ...findHits(productName, PRODUCT_RULES, "nome prodotto"),
    ...findHits(categoriesText, PRODUCT_RULES, "categorie"),
  ];

  const hasIngredients = !!normalize(ingredientsText).trim();
  const usedOnlyFallback = !hasIngredients && hits.length > 0;

  const hasNO = hits.some(h => h.verdict === "NO");
  if (hasNO) {
    const reasons = hits.filter(h => h.verdict === "NO").map(h => h.msg);
    if (usedOnlyFallback) reasons.unshift("Ingredienti non disponibili: valutazione basata su nome/categorie.");
    return { verdict: "NO", reasons };
  }

  const hasWARN = hits.some(h => h.verdict === "ATTENZIONE");
  if (hasWARN) {
    const reasons = hits.filter(h => h.verdict === "ATTENZIONE").map(h => h.msg);
    if (usedOnlyFallback) reasons.unshift("Ingredienti non disponibili: valutazione basata su nome/categorie.");
    return { verdict: "ATTENZIONE", reasons };
  }

  if (!hasIngredients) {
    return {
      verdict: "SCONOSCIUTO",
      reasons: ["Ingredienti non disponibili e nessuna corrispondenza su nome/categorie."],
    };
  }

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
  // Richiedi ingredienti IT + fallback generico + categorie
  const fields = [
    "product_name",
    "product_name_it",
    "ingredients_text_it",
    "ingredients_text",
    "categories",
    "categories_tags",
    "lang",
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
    const categories =
      p.categories || (Array.isArray(p.categories_tags) ? p.categories_tags.join(" ") : "");

    nameOut.textContent = name;
    ingOut.textContent = ing ? ing : "(non disponibile)";

    const ev = evaluateProduct({
      ingredientsText: ing,
      productName: name,
      categoriesText: categories,
    });

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