// script.js 最終決定版（ボタンの判定バグ完全修正）
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

// ----------------------
// 画面カード描画（通常モード用）
// ----------------------
function renderCards() {
  const list = getFilteredAndSortedCards();
  cardList.innerHTML = "";
  
  let own = 0;
  let want = 0;
  let currentGroup = "";
  const mode = groupMode.value;

  list.forEach(card => {
    const data = saveData[card.id] || { count: 0, want: false, memo: "" };
    if (data.count > 0) own++;
    if (data.want) want++;

    let groupName = "";
    if (mode === "wave") groupName = card.wave;
    if (mode === "character") groupName = cleanName(card.character);

    if (mode !== "none" && groupName !== currentGroup) {
      currentGroup = groupName;
      const title = document.createElement("div");
      title.className = "wave-title";
      title.textContent = mode === "wave" ? "💖 " + groupName : "🌟 " + groupName;
      cardList.appendChild(title);
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
    list.sort((a, b) => a.character.localeCompare(b.character, "ja", { numeric: true }));
  } else {
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
    <img src="img/${card.image}" onerror="this.src=''">
    <div class="card-id">${card.id}</div>
    <div class="dress">${card.dress}</div>
    <div class="char-name">${cleanName(card.character)}</div>
    <div class="rarity-badge">${card.rarity}</div>
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

    plus.onclick = () => { data.count++; update(); };
    minus.onclick = () => { if (data.count > 0) data.count--; update(); };
    num.onchange = () => { data.count = Number(num.value) || 0; update(); };
    
    heart.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      data.want = !data.want;
      update();
    };

    memo.oninput = () => {
      data.memo = memo.value.slice(0, 20);
      saveData[card.id] = data;
      save();
    };
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
document.getElementById("saveAll").onclick = () => { capture("一覧"); };
document.getElementById("saveWant").onclick = () => {
  wantOnly.checked = true;
  renderCards();
  setTimeout(() => { capture("求カード"); }, 300);
};

function capture(name) {
  const captureArea = document.getElementById("captureArea");
  const mode = groupMode.value;

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
  } else {
    const groups = {};
    list.forEach(card => {
      let gName = (mode === "wave") ? card.wave : cleanName(card.character);
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(card);
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
        title.textContent = (mode === "wave" ? "💖 " : "🌟 ") + gName;
        groupBox.appendChild(title);

        const miniList = document.createElement("div");
        miniList.className = "mini-list";
        groups[gName].forEach(card => {
          const data = saveData[card.id] || { count: 0, want: false, memo: "" };
          miniList.appendChild(createCardElement(card, data, true));
        });
        groupBox.appendChild(miniList);
        groupGrid.appendChild(groupBox);
      } else {
        if (groupGrid.children.length > 0) {
          wrapper.appendChild(groupGrid.cloneNode(true));
          groupGrid.innerHTML = ""; 
        }
        
        const title = document.createElement("div");
        title.className = "wave-title";
        title.textContent = (mode === "wave" ? "💖 " : "🌟 ") + gName;
        wrapper.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "capture-normal-grid";
        groups[gName].forEach(card => {
          const data = saveData[card.id] || { count: 0, want: false, memo: "" };
          grid.appendChild(createCardElement(card, data, true));
        });
        wrapper.appendChild(grid);
      }
    });

    if (groupGrid.children.length > 0) {
      wrapper.appendChild(groupGrid);
    }
  }

  captureArea.appendChild(wrapper);

  const oldWidth = captureArea.style.width;
  captureArea.style.width = "1800px";

  html2canvas(captureArea, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#fff8fc",
    windowWidth: 1800
  }).then(canvas => {
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = name + ".png";
    a.click();

    captureArea.style.width = oldWidth;
    captureArea.innerHTML = originalHTML;
    renderCards();
  });
}

// ----------------------
// ★修正：全選択・全解除イベント監視（文字クリックでも100%拾うようにclosestに改良）
// ----------------------
document.addEventListener("click", function(e) {
  // クリックされた要素、またはその一番近い親のbutton要素を取得
  const btn = e.target.closest("button");
  if (!btn) return; // ボタン以外なら何もしない

  const targetId = btn.id;
  if (!targetId) return;

  let className = "";
  let targetState = null;

  if (targetId === "btnRarityAll")  { className = ".rarity";    targetState = true; }
  if (targetId === "btnRarityNone") { className = ".rarity";    targetState = false; }
  if (targetId === "btnWaveAll")    { className = ".wave";      targetState = true; }
  if (targetId === "btnWaveNone")   { className = ".wave";      targetState = false; }
  if (targetId === "btnCharAll")    { className = ".character"; targetState = true; }
  if (targetId === "btnCharNone")   { className = ".character"; targetState = false; }

  if (className !== "") {
    e.preventDefault();
    e.stopPropagation();
    document.querySelectorAll(className).forEach(chk => {
      chk.checked = targetState;
    });
    renderCards(); // チェック切り替え後に画面を再描画
  }
});
