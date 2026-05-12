// script.js 完全版
// Googleスプレッドシート連携
// image列対応
// 所持数 / 求 / メモ保存
// 未所持モノクロ
// 求カードカラー＋ピンク枠
// キャラ番号非表示
// 見出し切替（なし / 弾 / キャラ）
// フィルター各種
// 画像保存

let cards = [];

let saveData =
JSON.parse(
  localStorage.getItem("aipriData")
) || {};

const SHEET_ID =
"1hVOnMYmMKbCbHcqVMNKqYPKtcCjOwq3S5ktDiC8n3zU";

const GID = "0";

const CSV_URL =
`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

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

// 011_ひまり → ひまり
function cleanName(name){

  if(!name) return "";

  return String(name)
    .replace(/^[^\d]*/, "")
    .replace(/^\d+\s*[_-]?\s*/, "")
    .trim();
}

function save(){

  localStorage.setItem(
    "aipriData",
    JSON.stringify(saveData)
  );
}

function unique(arr){

  return [...new Set(arr)]
    .filter(Boolean)
    .sort((a,b)=>
      a.localeCompare(
        b,
        "ja",
        {numeric:true}
      )
    );
}

function selectedValues(name){

  return [
    ...document.querySelectorAll(
      "." + name + ":checked"
    )
  ].map(el=>el.value);
}

// ----------------------
// CSV読込
// ----------------------

fetch(CSV_URL)
.then(r=>r.text())
.then(csv=>{

  cards = csvToJson(csv);

  makeFilters();
  renderCards();

});

// ----------------------
// CSV変換
// ----------------------

function csvToJson(csv){

  const lines =
    csv.trim().split("\n");

  const head =
    splitCSV(lines[0]);

  return lines
    .slice(1)
    .map(line=>{

      const cols =
        splitCSV(line);

      let obj = {};

      head.forEach((h,i)=>{
        obj[h.trim()] =
          cols[i]?.trim() || "";
      });

      return obj;

    });
}

function splitCSV(str){

  let result = [];
  let current = "";
  let inside = false;

  for(let c of str){

    if(c === '"'){
      inside = !inside;

    }else if(
      c === "," &&
      !inside
    ){
      result.push(current);
      current = "";

    }else{
      current += c;
    }
  }

  result.push(current);

  return result;
}

// ----------------------
// フィルター作成
// ----------------------

function makeFilters(){

  makeCheckGroup(
    "rarityChecks",
    unique(cards.map(c=>c.rarity)),
    "rarity"
  );

  makeCheckGroup(
    "waveChecks",
    unique(cards.map(c=>c.wave)),
    "wave"
  );

  makeCheckGroup(
    "characterChecks",
    unique(cards.map(c=>c.character)),
    "character"
  );
}

function makeCheckGroup(id,list,name){

  const area =
    document.getElementById(id);

  area.innerHTML = "";

  list.forEach(v=>{

    const label =
      document.createElement("label");

    const showText =
      name === "character"
      ? cleanName(v)
      : v;

    label.innerHTML = `
      <input type="checkbox"
             class="${name}"
             value="${v}"
             checked>
      ${showText}
    `;

    area.appendChild(label);

  });

  area
   .querySelectorAll("input")
   .forEach(el=>{

     el.addEventListener(
       "change",
       renderCards
     );

   });
}

// ----------------------
// 描画
// ----------------------

function renderCards(){

  let list = [...cards];

  // 検索
  const key =
    searchBox.value
    .toLowerCase();

  if(key){

    list = list.filter(c=>

      c.id
      .toLowerCase()
      .includes(key)

      ||

      c.dress
      .toLowerCase()
      .includes(key)

      ||

      cleanName(c.character)
      .toLowerCase()
      .includes(key)
    );
  }

  // チェック
  const rarity =
    selectedValues("rarity");

  const wave =
    selectedValues("wave");

  const character =
    selectedValues("character");

  list = list.filter(c=>

    rarity.includes(c.rarity)
    &&
    wave.includes(c.wave)
    &&
    character.includes(
      c.character
    )
  );

  // 状態絞り込み
  list = list.filter(card=>{

    const d =
      saveData[card.id]
      ||
      {
        count:0,
        want:false,
        memo:""
      };

    if(
      dupOnly.checked &&
      d.count < 1
    ) return false;

    if(
      wantOnly.checked &&
      !d.want
    ) return false;

    if(
      noneOnly.checked &&
      d.count > 0
    ) return false;

    return true;
  });

  // 並び
  const mode =
    groupMode.value;

  if(
    mode === "character"
  ){

    list.sort((a,b)=>
      a.character.localeCompare(
        b.character,
        "ja",
        {numeric:true}
      )
    );

  }else{

    list.sort((a,b)=>

      a.wave.localeCompare(
        b.wave,
        "ja",
        {numeric:true}
      )

      ||

      a.id.localeCompare(
        b.id,
        "ja",
        {numeric:true}
      )
    );
  }

  // 初期化
  cardList.innerHTML = "";

  let own = 0;
  let want = 0;
  let currentGroup = "";

  // カード描画
  list.forEach(card=>{

    const data =
      saveData[card.id]
      ||
      {
        count:0,
        want:false,
        memo:""
      };

    if(data.count > 0) own++;
    if(data.want) want++;

    // 見出し
    let groupName = "";

    if(mode === "wave"){
      groupName = card.wave;
    }

    if(mode === "character"){
      groupName =
        cleanName(
          card.character
        );
    }

    if(
      mode !== "none"
      &&
      groupName !== currentGroup
    ){

      currentGroup =
        groupName;

      const title =
        document.createElement("div");

      title.className =
        "wave-title";

      title.textContent =
        mode === "wave"
        ? "💖 " + groupName
        : "🌟 " + groupName;

      cardList.appendChild(
        title
      );
    }

    // カード
    const div =
      document.createElement("div");

    div.className =
      "card";

    if(
      data.count === 0
      &&
      !data.want
    ){
      div.classList.add(
        "no-own"
      );
    }

    if(data.want){
      div.classList.add(
        "wanting"
      );
    }

    div.innerHTML = `

      <button class="want">
        ${data.want ? "💖":"🤍"}
      </button>

      <img
        src="img/${card.image}"
        onerror="this.src=''"
      >

      <div class="card-id">
        ${card.id}
      </div>

      <div class="dress">
        ${card.dress}
      </div>

      <div>
        ${cleanName(
          card.character
        )}
      </div>

      <div>
        ${card.rarity}
      </div>

      <div class="count-box">

        <button class="minus">
          -
        </button>

        <input
          type="number"
          min="0"
          max="99"
          value="${data.count}"
        >

        <button class="plus">
          +
        </button>

      </div>

      <input
        class="memo"
        maxlength="20"
        placeholder="メモ20文字"
        value="${data.memo}"
      >
    `;

    // 要素取得
    const plus =
      div.querySelector(".plus");

    const minus =
      div.querySelector(".minus");

    const num =
      div.querySelector(
        "input[type=number]"
      );

    const heart =
      div.querySelector(".want");

    const memo =
      div.querySelector(".memo");

    // 加算
    plus.onclick = ()=>{

      data.count++;
      update();
    };

    // 減算
    minus.onclick = ()=>{

      if(data.count > 0){
        data.count--;
      }

      update();
    };

    // 数字入力
    num.onchange = ()=>{

      data.count =
        Number(num.value)
        || 0;

      update();
    };

    // 求
    heart.onclick = e=>{

      e.preventDefault();
      e.stopPropagation();

      data.want =
        !data.want;

      update();
    };

    // メモ
    memo.oninput = ()=>{

      data.memo =
        memo.value
        .slice(0,20);

      saveData[
        card.id
      ] = data;

      save();
    };

    function update(){

      saveData[
        card.id
      ] = data;

      save();
      renderCards();
    }

    cardList.appendChild(
      div
    );

  });

  // 件数
  document.getElementById(
    "totalCards"
  ).textContent =
    list.length + "件";

  document.getElementById(
    "ownedCards"
  ).textContent =
    "所持 " + own;

  document.getElementById(
    "wantedCards"
  ).textContent =
    "求 " + want;
}

// ----------------------
// 一括選択
// ----------------------

function toggleAll(
  type,
  state
){

  document
   .querySelectorAll(
     "." + type
   )
   .forEach(el=>{
      el.checked =
      state;
   });

  renderCards();
}

window.toggleAll =
toggleAll;

// ----------------------
// イベント
// ----------------------

[
 searchBox,
 dupOnly,
 wantOnly,
 noneOnly,
 groupMode

].forEach(el=>{

  el.addEventListener(
    "input",
    renderCards
  );

  el.addEventListener(
    "change",
    renderCards
  );

});

// ----------------------
// 保存
// ----------------------

document
.getElementById(
  "saveAll"
).onclick = ()=>{

  capture("一覧");
};

document
.getElementById(
  "saveWant"
).onclick = ()=>{

  wantOnly.checked =
    true;

  renderCards();

  setTimeout(()=>{

    capture(
      "求カード"
    );

  },300);
};

function capture(name){

  const area =
    document.getElementById(
      "captureArea"
    );

  // 元サイズ保存
  const oldWidth =
    area.style.width;

  // 保存時だけPC幅
  area.style.width =
    "1200px";

  area.classList.add(
    "capture-mode"
  );

  // placeholder消す
  document
   .querySelectorAll(".memo")
   .forEach(el=>{

     if(el.value.trim()===""){
       el.dataset.old =
         el.placeholder;

       el.placeholder = "";
     }

   });

  html2canvas(area,{
    scale:2,
    useCORS:true,
    backgroundColor:"#fff"
  }).then(canvas=>{

    const a =
      document.createElement("a");

    a.href =
      canvas.toDataURL("image/png");

    a.download =
      name + ".png";

    a.click();

    // 元に戻す
    area.style.width =
      oldWidth;

    area.classList.remove(
      "capture-mode"
    );

    document
     .querySelectorAll(".memo")
     .forEach(el=>{

       if(el.dataset.old){
         el.placeholder =
           el.dataset.old;
       }

     });

  });
}
