**Purpose**: Show match outcome and next actions.

**States**
- **Suggested Match**: Suggested expense found (no receipt attached)
- **No Match**: Added to inbox (unmatched)
- **Upload Failed**: Retry / save offline (future)

**UI Elements**
- Receipt thumbnail
- Outcome banner (Suggested / Unmatched)
- Suggested expense card (vendor, date, amount)
- Buttons: Accept / Match Manually / Go to Inbox / Done

---

### 4) Manual Match Screen (if selected)
**Purpose**: Let user pick an existing expense to match.

**UI Elements**
- Search + filter
- Expense list (date, vendor, amount)
- Confirm match button
- Cancel/back

---

### 5) Receipts Inbox (Reference)
**Purpose**: Review unmatched/suggested receipts.

**UI Elements**
- Tabs: Unmatched / Suggested / Orphaned
- Receipt cards (thumbnail, OCR summary)
- Actions: Accept / Match Manually

---

## B) Buttons & Actions (Explicit List)

### Capture Screen
- `Capture` → take photo → go to upload
- `Retake` → discard photo → return to preview
- `Flash` toggle → update camera flash mode
- `Exit` → return to previous screen

### Upload Progress
- `Cancel` (optional) → abort upload, return to capture

### Result Screen
- `Accept` → call accept suggestion endpoint
- `Match Manually` → open Manual Match screen
- `Go to Inbox` → navigate to receipts inbox
- `Done` → return to previous workflow step or receipts home

### Manual Match
- `Confirm Match` → call manual match endpoint
- `Cancel` → return to Result screen

---

## C) Flows (Step‑By‑Step)

### Flow 1: Suggested Match
1) Capture photo
2) Upload receipt
3) API returns `suggested_expense_id`
4) Show Result with suggested expense
5) User taps **Accept**
6) Receipt attached to expense → show success → Done

### Flow 2: No Match
1) Capture photo
2) Upload receipt
3) API returns no match
4) Show Result with “Added to Inbox”
5) User taps **Go to Inbox** (optional)

### Flow 3: Manual Match
1) Capture photo
2) Upload receipt
3) API returns suggested or unmatched
4) User taps **Match Manually**
5) Select expense → confirm match → success

### Flow 4: Upload Fail
1) Capture photo
2) Upload fails
3) Show error with Retry
4) Retry or Exit (offline queue later)

---

## D) Backend Functions / API Calls

### Upload
- `POST /api/v1/receipts/upload`
  - Input: multipart `receipt` file
  - Output: receipt suggestion with status + suggested expense (if any)

### Inbox
- `GET /api/v1/receipts/inbox`
  - Input: optional `filter` (`orphaned`)
  - Output: list of suggestions + candidate expenses

### Accept Suggested Match
- `POST /api/v1/receipts/suggestions/{id}/accept`
  - Output: success status

### Manual Match
- `POST /api/v1/receipts/suggestions/{id}/match`
  - Input: `expense_id`
  - Output: success status

---

## E) Mobile Functions (Client‑Side)

### Camera & Capture
- `requestCameraPermission()`
- `openCamera()`
- `capturePhoto()` → returns file/uri
- `retakePhoto()`
- `toggleFlash(mode)`

### Guidance & Quality Signals
- `analyzeFrame()` → returns `inFrame`, `blur`, `brightness`, `angleOk`
- `updateGuidanceUI(status)`
- `autoCaptureIfStable()` (optional)

### Upload & Result Handling
- `uploadReceipt(file)` → API call
- `handleUploadSuccess(response)`
- `handleUploadFailure(error)`
- `navigateToResult(state)`

### Matching
- `acceptSuggestion(suggestionId)`
- `manualMatch(suggestionId, expenseId)`
- `loadInbox(filter)`

---

## F) Data Models (Mobile View)

### ReceiptSuggestion (read‑only)
- `id`
- `receipt_id`
- `status` (`UNMATCHED` | `SUGGESTED` | `MATCHED`)
- `suggested_expense_id`
- `suggested_vendor`
- `suggested_date`
- `suggested_total`
- `suggested_confidence`
- `receipt_file_url`

### Expense (for matching)
- `id`
- `date`
- `amount`
- `vendor`
- `category_id`
- `job_id`

