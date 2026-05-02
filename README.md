# 동기 직장 지도

대학원 동기들의 성명, 직장명, 주소를 등록하고 지도에서 근무지를 확인하는 정적 웹 앱입니다.

## 실행

`index.html`을 브라우저로 열면 바로 사용할 수 있습니다.

## Kakao Maps 연결

1. [Kakao Developers](https://developers.kakao.com/)에서 앱을 만들고 JavaScript 키를 발급합니다.
2. 플랫폼 Web에 이 앱을 실행할 도메인을 등록합니다.
   - GitHub Pages 배포 주소는 `https://kibak812.github.io`를 등록합니다.
   - 로컬 테스트는 `file://`가 아니라 웹 서버 주소를 등록해야 합니다. 예: `http://localhost:8080`
3. 제품 설정의 카카오맵 사용 상태를 켭니다.
   - Kakao Developers > 내 애플리케이션 > 앱 선택 > 제품 설정 > 카카오맵 > 활성화 설정 > 상태 `ON`
   - `disabled OPEN_MAP_AND_LOCAL service` 오류가 나오면 이 설정이 꺼져 있거나 해당 앱에 카카오맵 권한이 없는 상태입니다.
4. 앱 우측 상단의 `Kakao JavaScript 키`에 키를 입력하고 `적용`을 누릅니다.

Kakao 키가 없으면 데모 지도 모드로 동작하며, 등록 데이터는 브라우저 `localStorage`에 저장됩니다.

## 로컬에서 실제 Kakao Maps 테스트

Kakao Maps JavaScript SDK는 등록된 사이트 도메인에서만 동작합니다. `index.html`을 직접 열어 `file://` 주소로 실행하면 실제 지도가 로드되지 않습니다.

```powershell
python -m http.server 8080
```

그다음 `http://localhost:8080`을 Kakao Developers의 Web 플랫폼에 등록하고, 브라우저에서 `http://localhost:8080`으로 접속해 테스트합니다.

## 포함 기능

- 동기 목록 검색
- 성명, 직장명, 주소 등록
- Kakao Maps SDK가 연결된 경우 주소를 좌표로 변환해 마커 표시
- SDK가 없을 때도 확인 가능한 데모 지도
- 선택 동기 상세 보기, 주소 복사, 목록 삭제
- 샘플 데이터 초기화

## 참고

주소 좌표 변환은 Kakao Maps JavaScript SDK의 `services` 라이브러리와 `Geocoder.addressSearch`를 사용합니다.
