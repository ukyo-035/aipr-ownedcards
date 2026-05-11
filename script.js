let cards = [];
let saveData = JSON.parse(localStorage.getItem("aipriData")) || {};

const SHEET_ID = "1hVOnMYmMKbCbHcqVMNKqYPKtcCjOwq3S5ktDiC8n3zU";
const GID = "0";

const CSV_URL =
`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

const cardList = document.getElementById("cardList");
const sortType = document.getElementById("sortType");
const searchBox = document.getElementById("searchBox");

fetch(CSV_URL)
  .then(res => res.text())
  .then(csv => {
    cards = csvToJson(csv);
    renderCards();
  });

function csvToJson(csv){
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",");

  return lines.slice(1).map(line=>{
    const cols = line.split(",");
    let obj = {};
    headers.forEach((h,i)=>{
      obj[h.trim()] = cols[i]?.trim() || "";
    });
    return obj;
  });
}

function renderCards(){
  let list = [...cards];

  const keyword = searchBox.value.toLowerCase();

  if(keyword){
    list = list.filter(c =>
      c.id.toLowerCase().includes(keyword) ||
      c.dress.toLowerCase().includes(keyword) ||
      c.character.toLowerCase().includes(keyword)
    );
  }

  const sort = sortType.value;

  if(sort==="character"){
    list.sort((a,b)=>a.character.localeCompare(b.character,"ja"));
  }

  if(sort==="wave"){
    list.sort((a,b)=>a.wave.localeCompare(b.wave,"ja"));
  }

  if(sort==="rarity"){
    list.sort((a,b)=>a.rarity.localeCompare(b.rarity,"ja"));
  }

  cardList.innerHTML = "";

  let ownCount = 0;
  let wantCount = 0;

  list.forEach(card=>{

    const data = saveData[card.id] || {count:0,want:false};

    if(data.count>0) ownCount++;
    if(data.want) wantCount++;

    const div = document.createElement("div");
    div.className = "card";

    if(data.count===0) div.classList.add("no-own");

    div.innerHTML = `
      <button class="want">${data.want?"💖":"🤍"}</button>
      <img src="img/${card.image}" onerror="this.src=''" />
      <div class="card-id">${card.id}</div>
      <div>${card.dress}</div>
      <div>${card.character}</div>
      <div>${card.rarity}</div>
      <div class="count">所持 ${data.count}</div>
      ${data.count>=2?'<div class="duplicate">ダブり</div>':''}
    `;

    div.onclick = ()=>{
      data.count++;
      saveData[card.id]=data;
      save();
      renderCards();
    };

    div.querySelector(".want").onclick = (e)=>{
      e.stopPropagation();
      data.want=!data.want;
      saveData[card.id]=data;
      save();
      renderCards();
    };

    cardList.appendChild(div);

  });

  document.getElementById("totalCards").textContent =
    cards.length+"枚";

  document.getElementById("ownedCards").textContent =
    "所持 "+ownCount;

  document.getElementById("wantedCards").textContent =
    "求 "+wantCount;
}

function save(){
 localStorage.setItem("aipriData",JSON.stringify(saveData));
}

sortType.onchange = renderCards;
searchBox.oninput = renderCards;
