# 동기 직장 지도

대학원 동기들의 성명, 직장명, 주소를 등록하고 지도에서 근무지를 확인하는 정적 웹 앱입니다.

## 실행

`index.html`을 브라우저로 열면 바로 사용할 수 있습니다.

## Kakao Maps 연결

1. [Kakao Developers](https://developers.kakao.com/)에서 앱을 만들고 JavaScript 키를 발급합니다.
2. 플랫폼 Web에 이 앱을 실행할 도메인을 등록합니다.
   - 로컬 파일로만 열 때는 카카오 지도 SDK 정책상 동작이 제한될 수 있습니다.
   - 실제 사용은 간단한 정적 호스팅이나 로컬 서버 도메인 등록을 권장합니다.
3. 앱 우측 상단의 `Kakao JavaScript 키`에 키를 입력하고 `적용`을 누릅니다.

Kakao 키가 없으면 데모 지도 모드로 동작하며, 등록 데이터는 브라우저 `localStorage`에 저장됩니다.

## 포함 기능

- 동기 목록 검색
- 성명, 직장명, 주소 등록
- Kakao Maps SDK가 연결된 경우 주소를 좌표로 변환해 마커 표시
- SDK가 없을 때도 확인 가능한 데모 지도
- 선택 동기 상세 보기, 주소 복사, 목록 삭제
- 샘플 데이터 초기화

## 참고

주소 좌표 변환은 Kakao Maps JavaScript SDK의 `services` 라이브러리와 `Geocoder.addressSearch`를 사용합니다.
