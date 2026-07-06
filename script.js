// script.js 2段階見出し不具合修正安全版
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
  if (!name) return "その他";
  return String(name)
    .replace(/^[^\d]*/, "")
    .replace(/^\d+\s*[_-]?\s*/, "")
    .trim() || "その他";
}

function save() {
  localStorage.setItem("aipriData", JSON.stringify(saveData));
}

function unique(arr) {
  return [...new Set(arr)]
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b), "ja", { numeric: true }));
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
  })
  .catch(err => {
    console.error("CSV読み込みエラー:", err);
  });

function csvToJson(csv) {
  if (!csv) return [];
  const lines = csv.trim().split("\n");
  if (lines.length === 0) return [];
  
  const head = splitCSV(lines[0]).map(h => h.trim());

  return lines.slice(1).map(line => {
    const cols = splitCSV(line);
    let obj = {};
    head.forEach((h, i) => {
      if (h) {
        obj[h] = cols[i]?.trim() || "";
      }
    });
    // 万が一特定の列がなくてもエラーにならないよう空文字で初期化保護
    if (!obj.id) obj.id = "";
    if (!obj.dress) obj.dress = "";
    if (!obj.character) obj.character = "";
    if (!obj.rarity) obj.rarity = "";
    if (!obj.wave) obj.wave = "";
    if (!obj.image) obj.image = "";
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
// 画面カード描画
// ----------------------
function renderCards() {
  if (!cardList) return;
  const list = getFilteredAndSortedCards();
  cardList.innerHTML = "";
  
  let own = 0;
  let want = 0;
  let currentMainGroup = "";
  let currentSubGroup = "";
  const mode = groupMode ? groupMode.value : "none";

  list.forEach(card => {
    const data = saveData[card.id] || { count: 0, want: false, memo: "" };
    if (data.count > 0) own++;
    if (data.want) want++;

    if (mode === "wave") {
      if (card.wave !== currentMainGroup) {
        currentMainGroup = card.wave;
        const title = document.createElement("div");
        title.className = "wave-title";
        title.textContent = "💖 " + (currentMainGroup || "未設定");
        cardList.appendChild(title);
      }
    } else if (mode === "character") {
      const charName = cleanName(card.character);
      // 大見出し
      if (charName !== currentMainGroup) {
        currentMainGroup = charName;
        currentSubGroup = ""; 
        const title = document.createElement("div");
        title.className = "wave-title";
        title.style.marginTop = "25px";
        title.textContent = "🌟 " + currentMainGroup;
        cardList.appendChild(title);
      }
      // 小見出し
      if (card.wave !== currentSubGroup) {
        currentSubGroup = card.wave;
        const subTitle = document.createElement("div");
        subTitle.className = "wave-title sub-wave-title";
        subTitle.style.fontSize = "15px";
        subTitle.style.paddingLeft = "15px";
        subTitle.style.borderLeft = "4px solid #ff80b3";
        subTitle.style.background = "rgba(255, 240, 245, 0.6)";
        subTitle.style.marginTop = "10px";
        subTitle.textContent = "🎬 " + (currentSubGroup || "他");
        cardList.appendChild(subTitle);
      }
    }

    const div = createCardElement(card, data, false); 
    cardList.appendChild(div);
  });

  const totalEl = document.getElementById("totalCards");
  const ownedEl = document.getElementById("ownedCards");
  const wantedEl = document.getElementById("wantedCards");

  if (totalEl) totalEl.textContent = list.length + "件";
  if (ownedEl) ownedEl.textContent = "所持 " + own;
  if (wantedEl) wantedEl.textContent = "求 " + want;
}

function getFilteredAndSortedCards() {
  if (!cards || cards.length === 0) return [];
  let list = [...cards];
  const key = searchBox ? searchBox.value.toLowerCase() : "";

  if (key) {
    list = list.filter(c =>
      (c.id && c.id.toLowerCase().includes(key)) ||
      (c.dress && c.dress.toLowerCase().includes(key)) ||
      (c.character && cleanName(c.character).toLowerCase().includes(key))
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
    if (dupOnly && dupOnly.checked && d.count < 1) return false;
    if (wantOnly && wantOnly.checked && !d.want) return false;
    if (noneOnly && noneOnly.checked && d.count > 0) return false;
    return true;
  });

  const mode = groupMode ? groupMode.value : "none";
  if (mode === "character") {
    list.sort((a, b) => {
      const valA_char = a.character || "";
      const valB_char = b.character || "";
      const compChar = valA_char.localeCompare(valB_char, "ja", { numeric: true });
      if (compChar !== 0) return compChar;

      const valA_wave = a.wave || "";
      const valB_wave = b.wave || "";
      const compWave = valA_wave.localeCompare(valB_wave, "ja", { numeric: true });
      if (compWave !== 0) return compWave;

      const valA_id = a.id || "";
      const valB_id = b.id || "";
      return valA_id.localeCompare(valB_id, "ja", { numeric: true });
    });
  } else {
    list.sort((a, b) => {
      const valA_wave = a.wave || "";
      const valB_wave = b.wave || "";
      const compWave = valA_wave.localeCompare(valB_wave, "ja", { numeric: true });
      if (compWave !== 0) return compWave;

      const valA_id = a.id || "";
      const valB_id = b.id || "";
      return valA_id.localeCompare(valB_id, "ja", { numeric: true });
    });
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
    <img src="img/${card.image || ''}" onerror="this.src=''">
    <div class="card-id">${card.id || ''}</div>
    <div class="dress">${card.dress || ''}</div>
    <div class="char-name">${cleanName(card.character)}</div>
    <div class="rarity-badge">${card.rarity || ''}</div>
    <div class="count-box">
      <button class="minus">-</button>
      <input type="number" min="0" max="99" value="${data.count}">
      <button class="plus">+</button>
    </div>
    ${memoHtml}
  `;

  if (!isCapture) {
    const plus = div.querySelector(".plus");
    const minus = div.querySelector(".minus");
    const num = div.querySelector("input[type=number]");
    const heart = div.querySelector(".want");
    const memo = div.querySelector(".memo");

    if (plus) plus.onclick = () => { data.count++; update(); };
    if (minus) minus.onclick = () => { if (data.count > 0) data.count--; update(); };
    if (num) num.onchange = () => { data.count = Number(num.value) || 0; update(); };
    
    if (heart) {
      heart.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        data.want = !data.want;
        update();
      };
    }

    if (memo) {
      memo.oninput = () => {
        data.memo = memo.value.slice(0, 20);
        saveData[card.id] = data;
        save();
      };
    }
  }

  function update() {
    saveData[card.id] = data;
    save();
    renderCards();
  }

  return div;
}

// ----------------------
// イベント監視（ツールバー）
// ----------------------
[searchBox, dupOnly, wantOnly, noneOnly, groupMode].forEach(el => {
  if (el) {
    el.addEventListener("input", renderCards);
    el.addEventListener("change", renderCards);
  }
});

// ----------------------
// 画像保存アクション
// ----------------------
const saveAllBtn = document.getElementById("saveAll");
const saveWantBtn = document.getElementById("saveWant");

if (saveAllBtn) saveAllBtn.onclick = () => { capture("一覧"); };
if (saveWantBtn) saveWantBtn.onclick = () => {
  if (wantOnly) wantOnly.checked = true;
  renderCards();
  setTimeout(() => { capture("求カード"); }, 300);
};

function capture(name) {
  const captureArea = document.getElementById("captureArea");
  if (!captureArea) return;
  const mode = groupMode ? groupMode.value : "none";

  const originalHTML = captureArea.innerHTML;
  const list = getFilteredAndSortedCards();

  captureArea.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "capture-mode";

  if (mode === "none") {
    const grid = document.createElement("div");
    grid.className = "capture-normal-grid";
    list.forEach(card => {
      const data = saveData[card.id] || { count: 0, want: false, memo: "" };
      grid.appendChild(createCardElement(card, data, true));
    });
    wrapper.appendChild(grid);
  } else if (mode === "wave") {
    const groups = {};
    list.forEach(card => {
      const w = card.wave || "未設定";
      if (!groups[w]) groups[w] = [];
      groups[w].push(card);
    });

    const groupGrid = document.createElement("div");
    groupGrid.className = "capture-group-grid";

    Object.keys(groups).forEach(gName => {
      const count = groups[gName].length;
      if (count === 0) return;

      if (count <= 10) {
        const groupBox = document.createElement("div");
        groupBox.className = "capture-group-box";
        
        const title = document.createElement("div");
        title.className = "wave-title";
        title.textContent = "💖 "
