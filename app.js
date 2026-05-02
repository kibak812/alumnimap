const STORAGE_KEY = "grad-work-map.people";
const KAKAO_KEY = "grad-work-map.kakao-key";

const samplePeople = [
  {
    id: crypto.randomUUID(),
    name: "김민준",
    company: "카카오",
    address: "경기도 성남시 분당구 판교역로 166",
    lat: 37.395021,
    lng: 127.110556,
  },
  {
    id: crypto.randomUUID(),
    name: "이서연",
    company: "서울대학교병원",
    address: "서울특별시 종로구 대학로 101",
    lat: 37.57964,
    lng: 126.99903,
  },
  {
    id: crypto.randomUUID(),
    name: "박지훈",
    company: "LG사이언스파크",
    address: "서울특별시 강서구 마곡중앙10로 30",
    lat: 37.56262,
    lng: 126.82982,
  },
  {
    id: crypto.randomUUID(),
    name: "최유진",
    company: "네이버 1784",
    address: "경기도 성남시 분당구 정자일로 95",
    lat: 37.35948,
    lng: 127.10523,
  },
];

let people = loadPeople();
let selectedId = people[0]?.id ?? null;
let kakaoMap = null;
let geocoder = null;
let markers = [];

const $ = (selector) => document.querySelector(selector);

const elements = {
  apiKey: $("#apiKey"),
  saveKey: $("#saveKey"),
  countText: $("#countText"),
  searchInput: $("#searchInput"),
  peopleList: $("#peopleList"),
  fallbackMap: $("#fallbackMap"),
  mapStatus: $("#mapStatus"),
  fitAll: $("#fitAll"),
  selectedPerson: $("#selectedPerson"),
  form: $("#personForm"),
  nameInput: $("#nameInput"),
  companyInput: $("#companyInput"),
  addressInput: $("#addressInput"),
  formMessage: $("#formMessage"),
  resetData: $("#resetData"),
};

elements.apiKey.value = localStorage.getItem(KAKAO_KEY) ?? "";

elements.saveKey.addEventListener("click", () => {
  const key = elements.apiKey.value.trim();
  if (!key) {
    setMessage("JavaScript 키를 입력하면 실제 카카오 지도를 불러옵니다.");
    return;
  }
  localStorage.setItem(KAKAO_KEY, key);
  loadKakaoMap(key);
});

elements.searchInput.addEventListener("input", render);
elements.fitAll.addEventListener("click", fitAllMarkers);
elements.resetData.addEventListener("click", () => {
  people = samplePeople.map((person) => ({ ...person, id: crypto.randomUUID() }));
  selectedId = people[0].id;
  persistPeople();
  render();
});

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const person = {
    id: crypto.randomUUID(),
    name: elements.nameInput.value.trim(),
    company: elements.companyInput.value.trim(),
    address: elements.addressInput.value.trim(),
  };

  if (!person.name || !person.company || !person.address) {
    setMessage("성명, 직장명, 주소를 모두 입력해 주세요.");
    return;
  }

  setMessage("주소를 좌표로 변환하는 중입니다...");
  const coords = await geocodeAddress(person.address);
  const nextPerson = { ...person, ...coords };
  people = [nextPerson, ...people];
  selectedId = nextPerson.id;
  persistPeople();
  elements.form.reset();
  setMessage(`${person.name}님의 직장 위치를 등록했습니다.`);
  render();
});

function loadPeople() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return samplePeople;
  try {
    return JSON.parse(saved);
  } catch {
    return samplePeople;
  }
}

function persistPeople() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
}

function render() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const filtered = people.filter((person) =>
    [person.name, person.company, person.address].some((value) => value.toLowerCase().includes(query)),
  );

  elements.countText.textContent = `${people.length}명`;
  renderPeopleList(filtered);
  renderSelected();
  renderMap(filtered);
}

function renderPeopleList(filtered) {
  if (filtered.length === 0) {
    elements.peopleList.innerHTML = `<div class="empty-state">검색 결과가 없습니다.</div>`;
    return;
  }

  elements.peopleList.innerHTML = filtered
    .map(
      (person) => `
        <button class="person-row ${person.id === selectedId ? "is-active" : ""}" data-id="${person.id}" type="button">
          <span>
            <strong>${escapeHtml(person.name)}</strong>
            <span>${escapeHtml(person.company)}</span>
            <small>${escapeHtml(person.address)}</small>
          </span>
          <i class="pin-dot" aria-hidden="true"></i>
        </button>
      `,
    )
    .join("");

  elements.peopleList.querySelectorAll(".person-row").forEach((row) => {
    row.addEventListener("click", () => {
      selectedId = row.dataset.id;
      render();
      focusSelectedMarker();
    });
  });
}

function renderSelected() {
  const person = people.find((item) => item.id === selectedId) ?? people[0];
  if (!person) {
    elements.selectedPerson.innerHTML = `<div class="empty-state">첫 동기를 등록해 보세요.</div>`;
    return;
  }

  elements.selectedPerson.innerHTML = `
    <span class="section-label">지도에서 보기</span>
    <h2>${escapeHtml(person.name)}</h2>
    <p class="company">${escapeHtml(person.company)}</p>
    <p>${escapeHtml(person.address)}</p>
    <div class="selected-actions">
      <button class="ghost-button" id="copyAddress" type="button">주소 복사</button>
      <button class="ghost-button" id="removePerson" type="button">삭제</button>
    </div>
  `;

  $("#copyAddress").addEventListener("click", async () => {
    await navigator.clipboard?.writeText(person.address);
    setMessage("주소를 복사했습니다.");
  });

  $("#removePerson").addEventListener("click", () => {
    people = people.filter((item) => item.id !== person.id);
    selectedId = people[0]?.id ?? null;
    persistPeople();
    setMessage(`${person.name}님을 목록에서 삭제했습니다.`);
    render();
  });
}

function renderMap(filtered) {
  if (kakaoMap && window.kakao?.maps) {
    renderKakaoMarkers(filtered);
    return;
  }

  elements.fallbackMap.innerHTML = filtered
    .map((person, index) => {
      const x = 16 + ((index * 23 + 11) % 68);
      const y = 15 + ((index * 31 + 8) % 66);
      return `
        <button class="map-pin" style="--x: ${x}%; --y: ${y}%;" data-id="${person.id}" aria-label="${escapeHtml(person.name)} 위치">
          <span>${escapeHtml(person.name.slice(0, 1))}</span>
        </button>
        <span class="map-label" style="--x: ${x}%; --y: ${y}%;">${escapeHtml(person.company)}</span>
      `;
    })
    .join("");

  elements.fallbackMap.querySelectorAll(".map-pin").forEach((pin) => {
    pin.addEventListener("click", () => {
      selectedId = pin.dataset.id;
      render();
    });
  });
}

function loadKakaoMap(key) {
  if (window.kakao?.maps) {
    initializeKakaoMap();
    return;
  }

  const script = document.createElement("script");
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=services&autoload=false`;
  script.onload = () => window.kakao.maps.load(initializeKakaoMap);
  script.onerror = () => setMessage("카카오 지도 스크립트를 불러오지 못했습니다. 키와 도메인 등록을 확인해 주세요.");
  document.head.appendChild(script);
}

function initializeKakaoMap() {
  const center = new kakao.maps.LatLng(37.566826, 126.9786567);
  kakaoMap = new kakao.maps.Map($("#map"), { center, level: 8 });
  geocoder = new kakao.maps.services.Geocoder();
  elements.mapStatus.textContent = "Kakao Maps 연결됨";
  render();
  fitAllMarkers();
}

function renderKakaoMarkers(filtered) {
  markers.forEach((marker) => marker.setMap(null));
  markers = filtered
    .filter((person) => Number.isFinite(person.lat) && Number.isFinite(person.lng))
    .map((person) => {
      const marker = new kakao.maps.Marker({
        map: kakaoMap,
        position: new kakao.maps.LatLng(person.lat, person.lng),
        title: `${person.name} - ${person.company}`,
      });
      kakao.maps.event.addListener(marker, "click", () => {
        selectedId = person.id;
        render();
      });
      return marker;
    });
}

function fitAllMarkers() {
  if (!kakaoMap || markers.length === 0) return;
  const bounds = new kakao.maps.LatLngBounds();
  markers.forEach((marker) => bounds.extend(marker.getPosition()));
  kakaoMap.setBounds(bounds);
}

function focusSelectedMarker() {
  const person = people.find((item) => item.id === selectedId);
  if (!kakaoMap || !person?.lat || !person?.lng) return;
  kakaoMap.panTo(new kakao.maps.LatLng(person.lat, person.lng));
}

function geocodeAddress(address) {
  if (!geocoder || !window.kakao?.maps?.services) {
    return Promise.resolve(fallbackCoords(address));
  }

  return new Promise((resolve) => {
    geocoder.addressSearch(address, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result[0]) {
        resolve({ lat: Number(result[0].y), lng: Number(result[0].x) });
        return;
      }
      setMessage("주소 검색 결과가 없어 데모 좌표로 표시했습니다. 정확한 도로명 주소를 확인해 주세요.");
      resolve(fallbackCoords(address));
    });
  });
}

function fallbackCoords(seed) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 100000;
  return {
    lat: 37.30 + (hash % 6500) / 100000,
    lng: 126.78 + (Math.floor(hash / 13) % 5200) / 100000,
  };
}

function setMessage(message) {
  elements.formMessage.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();

const savedKey = localStorage.getItem(KAKAO_KEY);
if (savedKey) loadKakaoMap(savedKey);
