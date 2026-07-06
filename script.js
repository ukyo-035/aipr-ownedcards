// script.js 最終決定版（キャラ選択時に大見出し：キャラ / 小見出し：弾数の2段階構造に対応）
let cards = [];
let saveData = JSON.parse(localStorage.getItem("aipriData")) || {};

const SHEET_ID = "1hVOnMYmMKbCbHcqVMNKqYPKtcCjOwq3S5ktDiC8n3zU";
const GID = "0";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

// ----------------------
// 要素
// ----------------------
const cardList   = document.getElementById("cardList");
const searchBox  = document.getElementById("searchBox");
const dupOnly    = document.getElementById("dupOnly");
const wantOnly   = document.getElementById("wantOnly");
const noneOnly   = document.getElementById("noneOnly");
const groupMode  = document.getElementById("groupMode");

// ----------------------
// 共通処理
// ----------------------
function cleanName(name) {
  if (!name) return "";
  return String(name)
    .replace(/^[^\d]*/, "")
    .replace(/^\d+\s*[_-]?\s*/, "")
    .trim();
}

function save() {
  localStorage.setItem("aipriData", JSON.stringify(saveData));
}

function unique(arr) {
  return [...new Set(arr)]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ja", { numeric: true }));
}

function selectedValues(name) {
  return [...document.querySelectorAll("." + name + ":checked")].map(el => el.value);
}

// ----------------------
// CSV読み込み
// ----------------------
fetch(CSV_URL)
  .then(r => r.text())
  .then(csv => {
    cards = csvToJson(csv);
    makeFilters();
    renderCards();
    bindFilterButtons();
  });

function csvToJson(csv) {
  const lines = csv.trim().split("\n");
  const head = splitCSV(lines[0]);

  return lines.slice(1).map(line => {
    const cols = splitCSV(line);
    let obj = {};
    head.forEach((h, i) => {
      obj[h.trim()] = cols[i]?.trim() || "";
    });
    return obj;
  });
}

function splitCSV(str) {
  let result = [];
  let current = "";
  let inside = false;

  for (let c of str) {
    if (c === '"') {
      inside = !inside;
    } else if (c === "," && !inside) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

// ----------------------
// フィルター生成
// ----------------------
function makeFilters() {
  makeCheckGroup("rarityChecks", unique(cards.map(c => c.rarity)), "rarity");
  makeCheckGroup("waveChecks", unique(cards.map(c => c.wave)), "wave");
  makeCheckGroup("characterChecks", unique(cards.map(c => c.character)), "character");
}

function makeCheckGroup(id, list, name) {
  const area = document.getElementById(id);
  if (!area) return;
  area.innerHTML = "";

  list.forEach(v => {
    const label = document.createElement("label");
    const showText = name === "character" ? cleanName(v) : v;

    label.innerHTML = `
      <input type="checkbox" class="${name}" value="${v}" checked>
      ${showText}
    `;
    area.appendChild(label);
  });

  area.querySelectorAll("input").forEach(el => {
    el.addEventListener("change", renderCards);
  });
}

function bindFilterButtons() {
  const config = [
    { btn: "btnRarityAll",  cls: ".rarity",    state: true },
    { btn: "btnRarityNone", cls: ".rarity",    state: false },
    { btn: "btnWaveAll",    cls: ".wave",      state: true },
    { btn: "btnWaveNone",   cls: ".wave",      state: false },
    { btn: "btnCharAll",    cls: ".character", state: true },
    { btn: "btnCharNone",   cls: ".character", state: false }
  ];

  config.forEach(item => {
    const el = document.getElementById(item.btn);
    if (el) {
      el.onclick = (e) => {
        e.preventDefault();
        document.querySelectorAll(item.cls).forEach(chk => chk.checked = item.state);
        renderCards();
      };
    }
  });
}

// ----------------------
// 画面カード描画（通常モード用）
// ----------------------
function renderCards() {
  const list = getFilteredAndSortedCards();
  cardList.innerHTML = "";
  
  let own = 0;
  let want = 0;
  let currentMainGroup = "";
  let currentSubGroup = "";
  const mode = groupMode.value;

  list.forEach(card => {
    const data = saveData[card.id] || { count: 0, want: false, memo: "" };
    if (data.count > 0) own++;
    if (data.want) want++;

    if (mode === "wave") {
      if (card.wave !== currentMainGroup) {
        currentMainGroup = card.wave;
        const title = document.createElement("div");
        title.className = "wave-title";
        title.textContent = "💖 " + currentMainGroup;
        cardList.appendChild(title);
      }
    } else if (mode === "character") {
      const charName = cleanName(card.character);
      // 大見出し（キャラ名）の作成
      if (charName !== currentMainGroup) {
        currentMainGroup = charName;
        currentSubGroup = ""; // キャラが変わったら弾数グループもリセット
        const title = document.createElement("div");
        title.className = "wave-title";
        title.style.marginTop = "25px";
        title.textContent = "🌟 " + currentMainGroup;
        cardList.appendChild(title);
      }
      // 小見出し（弾数）の作成
      if (card.wave !== currentSubGroup) {
        currentSubGroup = card.wave;
        const subTitle = document.createElement("div");
        subTitle.className = "wave-title sub-wave-title";
        subTitle.style.fontSize = "15px";
        subTitle.style.paddingLeft = "15px";
        subTitle.style.borderLeft = "4px solid #ff80b3";
        subTitle.style.background = "rgba(255, 240, 245, 0.6)";
        subTitle.style.marginTop = "10px";
        subTitle.textContent = "🎬 " + currentSubGroup;
        cardList.appendChild(subTitle);
      }
    }

    const div = createCardElement(card, data, false); 
    cardList.appendChild(div);
  });

  document.getElementById("totalCards").textContent = list.length + "件";
  document.getElementById("ownedCards").textContent = "所持 " + own;
  document.getElementById("wantedCards").textContent = "求 " + want;
}

function getFilteredAndSortedCards() {
  let list = [...cards];
  const key = searchBox.value.toLowerCase();

  if (key) {
    list = list.filter(c =>
      c.id.toLowerCase().includes(key) ||
      c.dress.toLowerCase().includes(key) ||
      cleanName(c.character).toLowerCase().includes(key)
    );
  }

  const rarity = selectedValues("rarity");
  const wave = selectedValues("wave");
  const character = selectedValues("character");

  list = list.filter(c =>
    rarity.includes(c.rarity) &&
    wave.includes(c.wave) &&
    character.includes(c.character)
  );

  list = list.filter(card => {
    const d = saveData[card.id] || { count: 0, want: false, memo: "" };
    if (dupOnly.checked && d.count < 1) return false;
    if (wantOnly.checked && !d.want) return false;
    if (noneOnly.checked && d.count > 0) return false;
    return true;
  });

  const mode = groupMode.value;
  if (mode === "character") {
    // 第一：キャラ順 -> 第二：弾(wave)順 -> 第三：カードID順
    list.sort((a, b) => {
      const compChar = a.character.localeCompare(b.character, "ja", { numeric: true });
      if (compChar !== 0) return compChar;

      const compWave = a.wave.localeCompare(b.wave, "ja", { numeric: true });
      if (compWave !== 0) return compWave;

      return a.id.localeCompare(b.id, "ja", { numeric: true });
    });
  } else {
    // 弾ごと、または見出しなしの場合
    list.sort((a, b) =>
      a.wave.localeCompare(b.wave, "ja", { numeric: true }) ||
      a.id.localeCompare(b.id, "ja", { numeric: true })
    );
  }
  return list;
}

function createCardElement(card, data, isCapture = false) {
  const div = document.createElement("div");
  div.className = "card";
  if (data.count === 0 && !data.want) div.classList.add("no-own");
  if (data.want) div.classList.add("wanting");

  let memoHtml = "";
  if (isCapture) {
    if (data.memo && data.memo.trim() !== "") {
      memoHtml = `<div class="capture-memo-text">${data.memo}</div>`;
    } else {
      memoHtml = `<div class="capture-memo-text empty"></div>`;
    }
  } else {
    memoHtml = `<input class="memo" maxlength="20" placeholder="" value="${data.memo || ''}">`;
  }

  div.innerHTML = `
    <button class="want">${data.want ? "💖" : "🤍"}</button>
    <img src="img/${card.image}"
