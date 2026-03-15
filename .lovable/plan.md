
## What's being tested

The full voice-to-graph pipeline for the "security-review" command:
1. User clicks Speak Up → browser SpeechRecognition fires transcript → edge function classifies it → `handleVoiceCommand` receives `{ action: 'security-review' }` → `handleSecurityReview()` runs → `securityOverlayActive` becomes `true` → security badge renders.

## What was verified manually

- Edge function tested via curl: `"show me risky files"` → `{ action: "security-review", confidence: 0.95 }` ✅
- `handleSecurityReview` in Dashboard.tsx: just calls `setSecurityOverlayActive(true)`, no Pro gate ✅  
- `securityOverlayActive` renders a purple badge button in the DOM when `true` ✅
- The confidence threshold in `useVoiceCommand` is `> 0.4`, and 0.95 passes ✅

## Test approach

We can't invoke the actual microphone in jsdom. The correct approach is:

**Unit-test `handleVoiceCommand` in isolation** by mocking `VoiceMicButton` to capture its `onResult` prop, then calling it with a fabricated `VoiceCommandResult`. This tests the wiring that matters: does the Dashboard react to the parsed result and show the overlay?

### File: `src/test/VoiceCommand.test.tsx` (new)

```
Render Dashboard (mocked children)
  ↓
Capture onResult prop from mocked VoiceMicButton
  ↓
Call onResult({ action: 'security-review', confidence: 0.95, ... })
  ↓
Assert: security overlay badge appears ("Security" text visible in DOM)
```

Also test:
- `switch-view solar` → Solar view renders
- `ghost-city` → ghost overlay badge appears
- Low-confidence result (`< 0.5`) → no state change (nothing activates)
- `clear` → overlay badge disappears after it was activated

## Files changed

| File | Change |
|---|---|
| `src/test/VoiceCommand.test.tsx` | New test file covering the 4 scenarios above |
| `src/test/Dashboard.test.tsx` | Update `SearchBar` mock to also export `scoreNode` (fix the existing broken mock) |

## Why this is the right test

SpeechRecognition is a browser API not available in jsdom. Testing it at the hook level requires complex polyfilling. The meaningful business logic — "does a parsed voice result change product state?" — lives entirely in `handleVoiceCommand` in Dashboard, and that is exactly what these tests exercise. Removing `VoiceMicButton` from the product means nothing changes when you say "show risky files" — which is the exact guarantee the test encodes.
