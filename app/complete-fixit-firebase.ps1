# Optional: run `gcloud auth login` first if you want gcloud to enable APIs automatically.
# Otherwise use Firebase Console to enable Storage (Get started) after Firestore exists.
$ErrorActionPreference = "Continue"
$ProjectId = "fixit-app-48290171"
Set-Location $PSScriptRoot

Write-Host "Setting gcloud project (optional) ..."
gcloud config set project $ProjectId 2>$null
gcloud services enable firestore.googleapis.com identitytoolkit.googleapis.com securetoken.googleapis.com firebasestorage.googleapis.com --project=$ProjectId 2>$null

Write-Host "Creating Firestore (default) if missing ..."
npx firebase firestore:databases:create "(default)" --location=us-central1 --project=$ProjectId 2>$null

Write-Host "Deploying Firestore rules + indexes ..."
npx firebase deploy --only firestore:rules,firestore:indexes --project=$ProjectId
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Deploying Storage rules (requires Storage 'Get started' in Console first) ..."
npx firebase deploy --only storage --project=$ProjectId
if ($LASTEXITCODE -ne 0) {
  Write-Host "Storage deploy skipped or failed. Open: https://console.firebase.google.com/project/$ProjectId/storage"
}

Write-Host "Enable Anonymous auth: https://console.firebase.google.com/project/$ProjectId/authentication/providers"
