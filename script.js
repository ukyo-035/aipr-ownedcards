// script.js 完全版
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
// 共通
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
// CSV読込
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
// フィルター作成
// ----------------------
function makeFilters() {
  makeCheckGroup("rarityChecks", unique(cards.map(c => c.rarity)), "rarity");
  makeCheckGroup("waveChecks", unique(cards.map(c => c.wave)), "wave");
  makeCheckGroup("characterChecks", unique(cards.map(c => c.character)), "character");
}

function makeCheckGroup(id, list, name) {
  const area = document.getElementById(id);
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
// 描画（通常画面用）
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

    const div = createCardElement(card, data);
    cardList.appendChild(div);
  });

  document.getElementById("totalCards").textContent = list.length + "件";
  document.getElementById("ownedCards").textContent = "所持 " + own;
  document.getElementById("wantedCards").textContent = "求 " + want;
}

// フィルター・ソート済みのカード配列を返す処理
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

// 単一のカードDOM要素を生成する処理
function createCardElement(card, data) {
  const div = document.createElement("div");
  div.className = "card";
  if (data.count === 0 && !data.want) div.classList.add("no-own");
  if (data.want) div.classList.add("wanting");

  const hasMemoAttr = data.memo ? 'data-has-memo="true"' : 'data-has-memo="false"';

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
    <input class="memo" maxlength="20" placeholder="メモ20文字" value="${data.memo || ''}" ${hasMemoAttr}>
  `;

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
    memo.setAttribute("data-has-memo", data.memo ? "true" : "false");
    saveData[card.id] = data;
    save();
  };

  function update() {
    saveData[card.id] = data;
    save();
    renderCards();
  }

  return div;
}

// ----------------------
// イベント
// ----------------------
[searchBox, dupOnly, wantOnly, noneOnly, groupMode].forEach(el => {
  el.addEventListener("input", renderCards);
  el.addEventListener("change", renderCards);
});

// ----------------------
// 保存
// ----------------------
document.getElementById("saveAll").onclick = () => { capture("一覧"); };
document.getElementById("saveWant").onclick = () => {
  wantOnly.checked = true;
  renderCards();
  setTimeout(() => { capture("求カード"); }, 300);
};

// 画像保存用キャプチャ関数
function capture(name) {
  const captureArea = document.getElementById("captureArea");
  const mode = groupMode.value;

  // 1. 元の状態をバックアップ
  const originalHTML = captureArea.innerHTML;

  // 2. アクティブなカードの一覧を再取得
  const list = getFilteredAndSortedCards();

  // 3. 画像保存専用のHTML構造を生成
  captureArea.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "capture-mode";

  if (mode === "none") {
    // 見出しなし：通常の10列グリッド
    const grid = document.createElement("div");
    grid.className = "capture-normal-grid";
    list.forEach(card => {
      const data = saveData[card.id] || { count: 0, want: false, memo: "" };
      grid.appendChild(createCardElement(card, data));
    });
    wrapper.appendChild(grid);
  } else {
    // グループ分けを実行
    const groups = {};
    list.forEach(card => {
      let gName = (mode === "wave") ? card.wave : cleanName(card.character);
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(card);
    });

    // メインの横並びコンテナ
    const groupGrid = document.createElement("div");
    groupGrid.className = "capture-group-grid";

    Object.keys(groups).forEach(gName => {
      const count = groups[gName].length;
      if (count === 0) return;

      if (count <= 10) {
        // ★修正ポイント：10枚を超えない場合は「横並びボックス」にする
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
          miniList.appendChild(createCardElement(card, data));
        });
        groupBox.appendChild(miniList);
        groupGrid.appendChild(groupBox);
      } else {
        // 10枚を超える場合は、グリッドを一度リセットして縦積みフルサイズで配置
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
          grid.appendChild(createCardElement(card, data));
        });
        wrapper.appendChild(grid);
      }
    });

    if (groupGrid.children.length > 0) {
      wrapper.appendChild(groupGrid);
    }
  }

  captureArea.appendChild(wrapper);

  // 4. 固定幅を設定して撮影
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

    // 5. 元の状態に完全復元
    captureArea.style.width = oldWidth;
    captureArea.innerHTML = originalHTML;
    renderCards();
  });
}
