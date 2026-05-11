// script.js フィルター強化完全版

let cards = [];
let saveData = JSON.parse(localStorage.getItem("aipriData")) || {};

const SHEET_ID = "1hVOnMYmMKbCbHcqVMNKqYPKtcCjOwq3S5ktDiC8n3zU";
const GID = "0";
const CSV_URL =
`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

const cardList = document.getElementById("cardList");
const searchBox = document.getElementById("searchBox");

const dupOnly = document.getElementById("dupOnly");
const wantOnly = document.getElementById("wantOnly");
const noneOnly = document.getElementById("noneOnly");

fetch(CSV_URL)
.then(r=>r.text())
.then(csv=>{
  cards = csvToJson(csv);
  makeFilters();
  renderCards();
});

function csvToJson(csv){
  const lines = csv.trim().split("\n");
  const headers = splitCSV(lines[0]);

  return lines.slice(1).map(line=>{
    const cols = splitCSV(line);
    let obj = {};
    headers.forEach((h,i)=>{
      obj[h.trim()] = cols[i]?.trim() || "";
    });
    return obj;
  });
}

function splitCSV(str){
  const result = [];
  let current = "";
  let inside = false;

  for(let c of str){
    if(c === '"'){
      inside = !inside;
    }else if(c === "," && !inside){
      result.push(current);
      current="";
    }else{
      current += c;
    }
  }
  result.push(current);
  return result;
}

function makeFilters(){
  makeCheckGroup("rarityChecks", unique(cards.map(c=>c.rarity)), "rarity");
  makeCheckGroup("waveChecks", unique(cards.map(c=>c.wave)), "wave");
  makeCheckGroup("characterChecks", unique(cards.map(c=>c.character)), "character");
}

function makeCheckGroup(id,list,name){
  const area = document.getElementById(id);

  list.forEach(v=>{
    const label = document.createElement("label");
    label.innerHTML =
      `<input type="checkbox" class="${name}" value="${v}" checked> ${v}`;
    area.appendChild(label);
  });

  area.querySelectorAll("input").forEach(el=>{
    el.addEventListener("change",renderCards);
  });
}

function unique(arr){
  return [...new Set(arr)].filter(Boolean).sort((a,b)=>a.localeCompare(b,"ja"));
}

function selectedValues(className){
  return [...document.querySelectorAll("."+className+":checked")]
         .map(el=>el.value);
}

function renderCards(){

  let list = [...cards];

  const key = searchBox.value.toLowerCase();

  if(key){
    list = list.filter(c =>
      c.id.toLowerCase().includes(key) ||
      c.dress.toLowerCase().includes(key) ||
      c.character.toLowerCase().includes(key)
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

  list = list.filter(card=>{

    const d = saveData[card.id] || {count:0,want:false,memo:""};

    if(dupOnly.checked && d.count < 2) return false;
    if(wantOnly.checked && !d.want) return false;
    if(noneOnly.checked && d.count > 0) return false;

    return true;
  });

  cardList.innerHTML = "";

  let own = 0;
  let want = 0;

  list.forEach(card=>{

    const data = saveData[card.id] || {count:0,want:false,memo:""};

    if(data.count>0) own++;
    if(data.want) want++;

    const div = document.createElement("div");
    div.className = "card";

    if(data.count===0) div.classList.add("no-own");

    div.innerHTML = `
      <button class="want">${data.want?"💖":"🤍"}</button>
      <img src="img/${card.image}" onerror="this.src=''">
      <div class="card-id">${card.id}</div>
      <div class="dress">${card.dress}</div>
      <div>${card.character}</div>
      <div>${card.rarity}</div>

      <div class="count-box">
        <button class="minus">-</button>
        <input type="number" min="0" max="99" value="${data.count}">
        <button class="plus">+</button>
      </div>

      ${data.count>=2 ? '<div class="duplicate">ダブり</div>' : ''}

      <input class="memo" maxlength="20"
       placeholder="メモ20文字"
       value="${data.memo||''}">
    `;

    const plus = div.querySelector(".plus");
    const minus = div.querySelector(".minus");
    const num = div.querySelector("input[type=number]");
    const heart = div.querySelector(".want");
    const memo = div.querySelector(".memo");

    plus.onclick=()=>{
      data.count++;
      update();
    };

    minus.onclick=()=>{
      if(data.count>0) data.count--;
      update();
    };

    num.onchange=()=>{
      data.count = Number(num.value)||0;
      update();
    };

    heart.onclick=(e)=>{
      e.stopPropagation();
      data.want=!data.want;
      update();
    };

    memo.oninput=()=>{
      data.memo = memo.value.slice(0,20);
      saveData[card.id]=data;
      save();
    };

    function update(){
      saveData[card.id]=data;
      save();
      renderCards();
    }

    cardList.appendChild(div);

  });

  document.getElementById("totalCards").textContent =
    list.length + "件表示";

  document.getElementById("ownedCards").textContent =
    "所持 " + own;

  document.getElementById("wantedCards").textContent =
    "求 " + want;
}

function save(){
  localStorage.setItem("aipriData",JSON.stringify(saveData));
}

function toggleAll(type,state){
  document.querySelectorAll("." + type).forEach(el=>{
    el.checked = state;
  });
  renderCards();
}

window.toggleAll = toggleAll;

[
searchBox,
dupOnly,
wantOnly,
noneOnly
].forEach(el=>{
  el.addEventListener("input",renderCards);
  el.addEventListener("change",renderCards);
});

document.getElementById("saveAll").onclick=()=>{
  capture("一覧");
};

document.getElementById("saveWant").onclick=()=>{
  wantOnly.checked = true;
  renderCards();
  setTimeout(()=>capture("求カード"),300);
};

function capture(name){
  html2canvas(document.getElementById("captureArea")).then(canvas=>{
    const a = document.createElement("a");
    a.href = canvas.toDataURL();
    a.download = name + ".png";
    a.click();
  });
}
