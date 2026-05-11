// script.js

let cards = [];
let saveData = JSON.parse(localStorage.getItem("aipriData")) || {};

const cardList = document.getElementById("cardList");
const sortType = document.getElementById("sortType");
const searchBox = document.getElementById("searchBox");

fetch("cards.json")
  .then(res => res.json())
  .then(data => {
    cards = data;
    renderCards();
  });

function renderCards() {
  let list = [...cards];

  const keyword = searchBox.value.trim().toLowerCase();
  if (keyword) {
    list = list.filter(c =>
      c.id.toLowerCase().includes(keyword)
    );
  }

  const sort = sortType.value;

  if (sort === "character") {
    list.sort((a,b)=>a.character.localeCompare(b.character,"ja"));
  }

  if (sort === "wave") {
    list.sort((a,b)=>a.wave.localeCompare(b.wave,"ja"));
  }

  if (sort === "rarity") {
    list.sort((a,b)=>a.rarity.localeCompare(b.rarity,"ja"));
  }

  cardList.innerHTML = "";

  let ownCount = 0;
  let wantCount = 0;

  list.forEach(card => {
    const data = saveData[card.id] || {count:0,want:false};

    if (data.count > 0) ownCount++;
    if (data.want) wantCount++;

    const div = document.createElement("div");
    div.className = "card";

    if (data.count === 0) div.classList.add("no-own");

    div.innerHTML = `
      <button class="want">${data.want ? "💖":"🤍"}</button>
      <img src="img/${card.id}_O.jpg"
           onerror="this.src=''"
           alt="${card.id}">
      <div class="card-id">${card.id}</div>
      <div>${card.character}</div>
      <div>${card.rarity}</div>
      <div class="count">所持 ${data.count}</div>
      ${data.count >=2 ? '<div class="duplicate">ダブり</div>' : ''}
    `;

    // タップ +1
    div.addEventListener("click",(e)=>{
      if(e.target.classList.contains("want")) return;
      data.count++;
      saveData[card.id]=data;
      save();
      renderCards();
    });

    // 長押し -1
    let pressTimer;

    div.addEventListener("touchstart",()=>{
      pressTimer = setTimeout(()=>{
        if(data.count>0) data.count--;
        saveData[card.id]=data;
        save();
        renderCards();
      },600);
    });

    div.addEventListener("touchend",()=>{
      clearTimeout(pressTimer);
    });

    // 求カード
    div.querySelector(".want").addEventListener("click",(e)=>{
      e.stopPropagation();
      data.want=!data.want;
      saveData[card.id]=data;
      save();
      renderCards();
    });

    cardList.appendChild(div);
  });

  document.getElementById("totalCards").textContent =
    cards.length + "枚";

  document.getElementById("ownedCards").textContent =
    "所持 " + ownCount;

  document.getElementById("wantedCards").textContent =
    "求 " + wantCount;
}

function save(){
  localStorage.setItem("aipriData",JSON.stringify(saveData));
}

sortType.addEventListener("change",renderCards);
searchBox.addEventListener("input",renderCards);
