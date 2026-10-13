$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085'
$env:FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9095'
$env:NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'demo-choperia820'
$env:NEXT_PUBLIC_FIREBASE_API_KEY = 'demo-api-key'
$env:NEXT_PUBLIC_USE_FIREBASE_EMULATORS = 'true'
$env:NEXT_TEST_BUILD = 'true'
npx next dev --webpack --hostname 127.0.0.1 --port 3002
