const STORAGE_KEY = "grad-work-map.people";
const SEEDED_KEY = "grad-work-map.seeded";
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
    name: "한기태",
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
let selectedGroupKey = null;
let editingId = null;
let kakaoMap = null;
let geocoder = null;
let markers = [];

const $ = (selector) => document.querySelector(selector);

const elements = {
  apiKey: $("#apiKey"),
  apiEditor: $("#apiEditor"),
  apiState: $("#apiState"),
  saveKey: $("#saveKey"),
  toggleKey: $("#toggleKey"),
  countText: $("#countText"),
  searchInput: $("#searchInput"),
  peopleList: $("#peopleList"),
  fallbackMap: $("#fallbackMap"),
  mapStatus: $("#mapStatus"),
  fitAll: $("#fitAll"),
  selectedPerson: $("#selectedPerson"),
  form: $("#personForm"),
  submitPerson: $("#submitPerson"),
  cancelEdit: $("#cancelEdit"),
  nameInput: $("#nameInput"),
  companyInput: $("#companyInput"),
  addressInput: $("#addressInput"),
  formMessage: $("#formMessage"),
  resetData: $("#resetData"),
};

const savedKakaoKey = localStorage.getItem(KAKAO_KEY) ?? "";
elements.apiKey.value = savedKakaoKey;
setApiEditorOpen(!savedKakaoKey);
setApiState(savedKakaoKey ? "Kakao Maps 키 저장됨" : "Kakao Maps 설정 필요");

elements.saveKey.addEventListener("click", () => {
  const key = elements.apiKey.value.trim();
  if (!key) {
    setMessage("JavaScript 키를 입력하면 실제 카카오 지도를 불러옵니다.");
    return;
  }
  if (location.protocol === "file:") {
    setMessage("file://로 연 화면에서는 Kakao Maps 인증이 실패합니다. GitHub Pages 주소나 등록된 localhost 주소에서 열어 주세요.");
    elements.mapStatus.textContent = "file://에서는 Kakao Maps를 불러올 수 없습니다";
    return;
  }
  localStorage.setItem(KAKAO_KEY, key);
  setApiEditorOpen(false);
  setApiState("Kakao Maps 연결 중...");
  loadKakaoMap(key);
});

elements.toggleKey.addEventListener("click", () => {
  setApiEditorOpen(elements.apiEditor.classList.contains("is-hidden"));
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
    id: editingId ?? crypto.randomUUID(),
    name: elements.nameInput.value.trim(),
    company: elements.companyInput.value.trim(),
    address: elements.addressInput.value.trim(),
  };

  if (!person.name || !person.company || !person.address) {
    setMessage("성명, 직장명, 주소를 모두 입력해 주세요.");
    return;
  }

  setMessage(editingId ? "수정한 주소를 좌표로 변환하는 중입니다..." : "주소를 좌표로 변환하는 중입니다...");
  const coords = await geocodeAddress(person.address);
  const nextPerson = { ...person, ...coords };
  if (editingId) {
    people = people.map((item) => (item.id === editingId ? nextPerson : item));
  } else {
    people = [nextPerson, ...people];
  }
  selectedId = nextPerson.id;
  const wasEditing = Boolean(editingId);
  editingId = null;
  persistPeople();
  elements.form.reset();
  setFormMode();
  setMessage(`${person.name}님의 직장 위치를 ${wasEditing ? "수정" : "등록"}했습니다.`);
  render();
});

elements.cancelEdit.addEventListener("click", () => {
  editingId = null;
  elements.form.reset();
  setFormMode();
  setMessage("수정을 취소했습니다.");
});

function loadPeople() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    if (localStorage.getItem(SEEDED_KEY)) return [];
    localStorage.setItem(SEEDED_KEY, "true");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(samplePeople));
    return samplePeople;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function persistPeople() {
  localStorage.setItem(SEEDED_KEY, "true");
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

  const selectedGroup = selectedGroupKey ? groupPeople(people).find((group) => group.key === selectedGroupKey) : null;
  if (selectedGroup && selectedGroup.people.length > 1) {
    renderSelectedGroup(selectedGroup);
    return;
  }

  elements.selectedPerson.innerHTML = `
    <span class="section-label">지도에서 보기</span>
    <h2>${escapeHtml(person.name)}</h2>
    <p class="company">${escapeHtml(person.company)}</p>
    <p>${escapeHtml(person.address)}</p>
    <div class="selected-actions">
      <button class="ghost-button" id="editPerson" type="button">수정</button>
      <button class="ghost-button" id="copyAddress" type="button">주소 복사</button>
      <button class="ghost-button" id="removePerson" type="button">삭제</button>
    </div>
  `;

  $("#editPerson").addEventListener("click", () => {
    selectedGroupKey = null;
    startEdit(person);
  });

  $("#copyAddress").addEventListener("click", async () => {
    await navigator.clipboard?.writeText(person.address);
    setMessage("주소를 복사했습니다.");
  });

  $("#removePerson").addEventListener("click", () => {
    const confirmed = window.confirm(`${person.name}님을 목록에서 삭제할까요? 이 작업은 이 브라우저에 저장된 데이터를 변경합니다.`);
    if (!confirmed) return;
    people = people.filter((item) => item.id !== person.id);
    selectedId = people[0]?.id ?? null;
    selectedGroupKey = null;
    if (editingId === person.id) {
      editingId = null;
      elements.form.reset();
      setFormMode();
    }
    persistPeople();
    setMessage(`${person.name}님을 목록에서 삭제했습니다.`);
    render();
  });
}

function renderSelectedGroup(group) {
  elements.selectedPerson.innerHTML = `
    <span class="section-label">지도에서 보기</span>
    <h2>${escapeHtml(group.company)}</h2>
    <p class="company">근무 중인 동기 ${group.people.length}명</p>
    <p>${escapeHtml(group.address)}</p>
    <div class="group-list">
      ${group.people
        .map(
          (person) => `
            <button class="group-person" type="button" data-id="${person.id}">
              <strong>${escapeHtml(person.name)}</strong>
              <span>상세 보기</span>
            </button>
          `,
        )
        .join("")}
    </div>
  `;

  elements.selectedPerson.querySelectorAll(".group-person").forEach((button) => {
    button.addEventListener("click", () => {
      selectedId = button.dataset.id;
      selectedGroupKey = null;
      render();
      focusSelectedMarker();
    });
  });
}

function renderMap(filtered) {
  if (kakaoMap && window.kakao?.maps) {
    renderKakaoMarkers(filtered);
    return;
  }

  const groups = groupPeople(filtered);
  elements.fallbackMap.innerHTML = groups
    .map((group, index) => {
      const x = 16 + ((index * 23 + 11) % 68);
      const y = 15 + ((index * 31 + 8) % 66);
      const isCluster = group.people.length > 1;
      const label = isCluster ? group.people.length : group.people[0].name.slice(0, 1);
      const names = group.people.map((person) => person.name).join(", ");
      return `
        <button class="map-pin ${isCluster ? "is-cluster" : ""}" style="--x: ${x}%; --y: ${y}%;" data-key="${escapeHtml(group.key)}" aria-label="${escapeHtml(group.company)} 근무자 ${group.people.length}명">
          <span>${escapeHtml(label)}</span>
        </button>
        <div class="map-pin-tooltip" style="--x: ${x}%; --y: ${y}%;">
          <strong>${escapeHtml(group.company)}</strong>
          <span>${escapeHtml(names)}</span>
        </div>
        <span class="map-label" style="--x: ${x}%; --y: ${y}%;">${escapeHtml(group.company)}</span>
      `;
    })
    .join("");

  elements.fallbackMap.querySelectorAll(".map-pin").forEach((pin) => {
    pin.addEventListener("click", () => {
      const group = groups.find((item) => item.key === pin.dataset.key);
      if (!group) return;
      selectedGroupKey = group.key;
      selectedId = group.people[0].id;
      render();
    });
  });
}

function loadKakaoMap(key) {
  if (window.kakao?.maps) {
    initializeKakaoMap();
    return;
  }

  elements.mapStatus.textContent = "Kakao Maps 불러오는 중...";

  const script = document.createElement("script");
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=services&autoload=false`;
  script.onload = () => window.kakao.maps.load(initializeKakaoMap);
  script.onerror = () => {
    elements.mapStatus.textContent = "Kakao Maps 연결 실패";
    setMessage("카카오 지도 스크립트를 불러오지 못했습니다. JavaScript 키, 사이트 도메인, 카카오맵 활성화 상태를 확인해 주세요.");
  };
  document.head.appendChild(script);

  window.setTimeout(() => {
    if (!kakaoMap) {
      elements.mapStatus.textContent = "Kakao Maps 연결 대기 중";
      setMessage("지도가 계속 뜨지 않으면 Kakao Developers의 Web 플랫폼 도메인과 제품 설정 > 카카오맵 활성화 상태를 확인해 주세요.");
    }
  }, 5000);
}

function initializeKakaoMap() {
  const center = new kakao.maps.LatLng(37.566826, 126.9786567);
  kakaoMap = new kakao.maps.Map($("#map"), { center, level: 8 });
  geocoder = new kakao.maps.services.Geocoder();
  elements.mapStatus.textContent = "Kakao Maps 연결됨";
  setApiState("Kakao Maps 연결됨");
  setApiEditorOpen(false);
  render();
  fitAllMarkers();
}

function renderKakaoMarkers(filtered) {
  markers.forEach((marker) => marker.setMap(null));
  markers = groupPeople(filtered)
    .filter((group) => Number.isFinite(group.lat) && Number.isFinite(group.lng))
    .map((group) => {
      const position = new kakao.maps.LatLng(group.lat, group.lng);
      const content = createKakaoGroupMarker(group);
      const overlay = new kakao.maps.CustomOverlay({
        content,
        clickable: true,
        map: kakaoMap,
        position,
        yAnchor: 1,
      });

      content.addEventListener("click", () => {
        selectedGroupKey = group.key;
        selectedId = group.people[0].id;
        render();
      });

      return {
        getPosition: () => position,
        setMap: (map) => overlay.setMap(map),
      };
    });
}

function createKakaoGroupMarker(group) {
  const isCluster = group.people.length > 1;
  const label = isCluster ? group.people.length : group.people[0].name.slice(0, 1);
  const names = group.people.map((person) => person.name).join(", ");
  const button = document.createElement("button");
  button.type = "button";
  button.className = `kakao-marker ${isCluster ? "is-cluster" : ""}`;
  button.setAttribute("aria-label", `${group.company} 근무자 ${group.people.length}명`);

  const pin = document.createElement("span");
  pin.className = "kakao-marker-pin";
  const text = document.createElement("span");
  text.textContent = label;
  pin.append(text);
  button.append(pin);

  const tooltip = document.createElement("span");
  tooltip.className = "kakao-marker-tooltip";
  tooltip.innerHTML = `<strong>${escapeHtml(group.company)}</strong><span>${escapeHtml(names)}</span>`;
  button.append(tooltip);

  return button;
}

function groupPeople(list) {
  const groups = new Map();
  list.forEach((person) => {
    const locationKey =
      Number.isFinite(person.lat) && Number.isFinite(person.lng)
        ? `${person.lat.toFixed(5)},${person.lng.toFixed(5)}`
        : normalizeKey(person.address);
    const key = `${normalizeKey(person.company)}|${locationKey}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        company: person.company,
        address: person.address,
        lat: person.lat,
        lng: person.lng,
        people: [],
      });
    }
    groups.get(key).people.push(person);
  });
  return [...groups.values()];
}

function normalizeKey(value) {
  return String(value).trim().replace(/\s+/g, " ").toLowerCase();
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

function startEdit(person) {
  editingId = person.id;
  selectedId = person.id;
  elements.nameInput.value = person.name;
  elements.companyInput.value = person.company;
  elements.addressInput.value = person.address;
  setFormMode();
  setMessage(`${person.name}님의 정보를 수정 중입니다.`);
  render();
  elements.nameInput.focus();
}

function setFormMode() {
  const isEditing = Boolean(editingId);
  elements.submitPerson.textContent = isEditing ? "수정 저장" : "등록";
  elements.cancelEdit.classList.toggle("is-hidden", !isEditing);
}

function setApiState(message) {
  elements.apiState.textContent = message;
}

function setApiEditorOpen(isOpen) {
  elements.apiEditor.classList.toggle("is-hidden", !isOpen);
  elements.toggleKey.textContent = isOpen ? "닫기" : "설정";
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

if (savedKakaoKey && location.protocol !== "file:") {
  loadKakaoMap(savedKakaoKey);
} else if (location.protocol === "file:") {
  elements.mapStatus.textContent = "API 키 미적용: file:// 데모 지도 사용 중";
}
