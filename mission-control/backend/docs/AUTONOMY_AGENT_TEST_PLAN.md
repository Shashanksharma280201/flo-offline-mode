# Autonomy Agent - End-to-End Test Plan

## Overview
This document outlines the comprehensive test plan for the Autonomy Agent (Command Executor) - a GPT-4o powered voice assistant that can execute operational tasks in the Flo Mobility fleet management system.

## Architecture Summary
- **Backend**: GPT-4o function calling with 25 operational functions
- **Frontend**: Voice recording → Whisper transcription → GPT-4o execution → UI feedback
- **Endpoint**: `POST /api/v1/autonomy-agent/command`
- **Features**: Smart disambiguation, confirmation dialogs, text-to-speech, conversation state

---

## Test Categories

### 1. Mission Control Commands

#### 1.1 Execute Mission (Safe Operation)
**Test Command**: "Send MMR-31 to kitchen in office pathmap"

**Expected Flow**:
1. User clicks record button and speaks command
2. Whisper transcribes audio
3. GPT-4o calls `executeRobotMission` function
4. Backend resolves:
   - Robot: MMR-31 (exact match, score=100)
   - PathMap: "office" (exact/partial match)
   - Mission: "kitchen" (station name)
5. Frontend shows confirmation dialog (safe operation, no confirmation needed)
6. Text-to-speech announces: "Executing mission to kitchen on robot MMR-31..."
7. ROS command sent to robot

**Success Criteria**:
- ✅ Audio transcribed correctly
- ✅ Robot, pathmap, and mission resolved
- ✅ No disambiguation required (high confidence)
- ✅ TTS feedback heard
- ✅ Mission execution initiated

---

#### 1.2 Abort Mission (Destructive Operation)
**Test Command**: "Abort mission on MMR-31"

**Expected Flow**:
1. User speaks command
2. GPT-4o calls `abortRobotMission` function
3. Backend resolves robot
4. **Confirmation dialog shown**: "Are you sure you want to abort the mission on MMR-31?"
5. User clicks "Confirm"
6. Follow-up voice command or button press confirms
7. Mission aborted

**Success Criteria**:
- ✅ Confirmation dialog appears
- ✅ Abort only executes after confirmation
- ✅ TTS feedback: "Mission aborted on MMR-31"

---

#### 1.3 Pause/Resume Mission
**Test Commands**:
- "Pause mission on robot 31"
- "Resume mission on MMR 31"

**Expected Flow**:
1. Pause command → immediate execution (safe operation)
2. Resume command → immediate execution (safe operation)
3. Both should work with robot name variations (MMR-31, robot 31, 31)

**Success Criteria**:
- ✅ Robot name normalization works (separator-agnostic)
- ✅ Pause and resume execute without confirmation
- ✅ TTS feedback for both operations

---

#### 1.4 Return to Station
**Test Command**: "Send MMR-31 back to home station"

**Expected Flow**:
1. GPT-4o calls `returnRobotToStation` function
2. Backend resolves robot and station name "home"
3. If station exists, execute immediately
4. If station doesn't exist, show disambiguation or error

**Success Criteria**:
- ✅ Station resolution works
- ✅ Command executes
- ✅ TTS feedback

---

### 2. PathMap Management

#### 2.1 Create PathMap
**Test Command**: "Create pathmap named warehouse in GPS mode"

**Expected Flow**:
1. GPT-4o calls `createPathMap` function with:
   - name: "warehouse"
   - frame: "gps"
   - owner: (from user context)
2. PathMap created in database
3. TTS: "PathMap warehouse created successfully in GPS mode"

**Success Criteria**:
- ✅ PathMap created with correct frame
- ✅ Owner set from authenticated user
- ✅ TTS confirmation

---

#### 2.2 Delete PathMap (Destructive)
**Test Command**: "Delete pathmap office"

**Expected Flow**:
1. GPT-4o calls `deletePathMap` function
2. Resolves pathmap "office"
3. **Confirmation dialog**: "Are you sure you want to delete pathmap office?"
4. User confirms
5. PathMap deleted

**Success Criteria**:
- ✅ Confirmation required
- ✅ Deletion only after confirmation
- ✅ TTS feedback

---

#### 2.3 Add Station to PathMap
**Test Command**: "Add station named loading dock to warehouse pathmap"

**Expected Flow**:
1. GPT-4o calls `addStationToPathMap` function with:
   - pathMapName: "warehouse"
   - stationName: "loading dock"
   - x, y coordinates (default 0, 0)
2. Station added to pathmap.stations array
3. TTS: "Station loading dock added to warehouse pathmap"

**Success Criteria**:
- ✅ Station created with correct ID (not name field)
- ✅ Station added to pathmap
- ✅ TTS confirmation

---

#### 2.4 Remove Station (Destructive)
**Test Command**: "Remove station loading dock from warehouse"

**Expected Flow**:
1. GPT-4o calls `removeStationFromPathMap`
2. Confirmation dialog shown
3. Station removed after confirmation

**Success Criteria**:
- ✅ Confirmation required
- ✅ Station removed only after confirmation

---

#### 2.5 Rename Station
**Test Command**: "Rename station loading dock to shipping bay in warehouse"

**Expected Flow**:
1. GPT-4o calls `renameStation` function with:
   - pathMapName: "warehouse"
   - oldName: "loading dock"
   - newName: "shipping bay"
2. Station ID field updated (NOT name field - Station uses id)
3. TTS confirmation

**Success Criteria**:
- ✅ Station.id updated correctly
- ✅ No duplicate station created
- ✅ TTS feedback

---

### 3. Mission Management

#### 3.1 Create Mission
**Test Command**: "Create mission named delivery in warehouse pathmap"

**Expected Flow**:
1. GPT-4o calls `createMission` function
2. Mission created with empty path array
3. TTS: "Mission delivery created in warehouse pathmap"

**Success Criteria**:
- ✅ Mission created
- ✅ Mission linked to correct pathmap
- ✅ TTS confirmation

---

#### 3.2 Delete Mission (Destructive)
**Test Command**: "Delete mission delivery from warehouse"

**Expected Flow**:
1. Confirmation dialog shown
2. Mission deleted after confirmation

**Success Criteria**:
- ✅ Confirmation required
- ✅ Deletion after confirmation

---

### 4. Disambiguation Scenarios

#### 4.1 Multiple Robots Match
**Setup**: Create robots MMR-31 and MMR-310

**Test Command**: "Send robot 31 to kitchen"

**Expected Flow**:
1. GPT-4o calls `executeRobotMission`
2. Backend finds 2 robots matching "31"
3. Disambiguation dialog shown:
   ```
   Multiple robots found:
   1. MMR-31 (Active)
   2. MMR-310 (Offline)
   Choose option:
   ```
4. User clicks "MMR-31" or speaks "option 1"
5. Follow-up function call with `selectDisambiguationChoice`
6. Mission executes on selected robot

**Success Criteria**:
- ✅ Disambiguation dialog appears
- ✅ Options numbered correctly
- ✅ Follow-up command resolves selection
- ✅ Conversation ID maintained across turns

---

#### 4.2 Multiple PathMaps Match
**Setup**: Create pathmaps "office-floor-1" and "office-floor-2"

**Test Command**: "Add station reception to office"

**Expected Flow**:
1. Multiple pathmaps match "office"
2. Disambiguation dialog shown with both options
3. User selects one
4. Station added to selected pathmap

**Success Criteria**:
- ✅ Disambiguation works for pathmaps
- ✅ Selection processed correctly

---

#### 4.3 Separator-Agnostic Matching (Auto-resolve)
**Test Commands**:
- "Send MMR-31 to kitchen" (exact match with hyphen)
- "Send MMR_31 to kitchen" (underscore)
- "Send MMR 31 to kitchen" (space)
- "Send robot 31 to kitchen" (no prefix)

**Expected Flow**:
All commands should auto-resolve to same robot MMR-31 without disambiguation (score=95, separator-agnostic)

**Success Criteria**:
- ✅ All variations resolve to MMR-31
- ✅ No disambiguation dialog (confidence ≥95)
- ✅ Immediate execution

---

### 5. Multi-Turn Conversation

#### 5.1 Continuation Across Turns
**Test Flow**:
1. "Create pathmap warehouse in GPS mode" → Creates pathmap, returns conversationId
2. "Add station loading dock" → Uses previous pathmap context
3. "Add station shipping bay" → Uses same pathmap context

**Expected Flow**:
1. First command creates pathmap, stores conversationId
2. Second command should infer pathmap from conversation context
3. Third command continues same context

**Success Criteria**:
- ✅ Conversation ID maintained
- ✅ Context carried across turns
- ✅ No need to repeat pathmap name

---

#### 5.2 Disambiguation Follow-up
**Test Flow**:
1. "Send robot 31 to kitchen" → Multiple robots, shows disambiguation
2. User clicks "MMR-31" or speaks "option 1"
3. Backend processes selection via `selectDisambiguationChoice`

**Expected Flow**:
1. Conversation state status = 'awaiting_disambiguation'
2. Frontend shows dialog
3. User selection sent with conversationId
4. Backend processes with conversation context
5. Mission executes

**Success Criteria**:
- ✅ Disambiguation data stored in conversation state
- ✅ Follow-up resolves correctly
- ✅ Mission executes on selected robot

---

### 6. Text-to-Speech Verification

**Test Commands** (any of the above)

**Expected Behavior**:
- All successful operations should trigger TTS
- Voice should announce:
  - Operation type
  - Entity names (robot, pathmap, station)
  - Success/failure status

**Success Criteria**:
- ✅ Browser SpeechSynthesis API invoked
- ✅ Agent response spoken clearly
- ✅ No TTS overlap (previous stopped before new one starts)

---

### 7. Error Handling

#### 7.1 Entity Not Found
**Test Command**: "Send robot INVALID to kitchen"

**Expected Flow**:
1. Backend searches for robot "INVALID"
2. No matches found
3. GPT-4o receives error in function result
4. TTS: "Sorry, I couldn't find a robot named INVALID"

**Success Criteria**:
- ✅ Graceful error message
- ✅ TTS announces error
- ✅ No crash

---

#### 7.2 Invalid Audio Upload
**Test**: Upload non-audio file

**Expected Flow**:
1. Multer rejects file
2. Error response
3. Frontend shows error message

**Success Criteria**:
- ✅ Proper error handling
- ✅ User-friendly error message

---

#### 7.3 OpenAI API Failure
**Test**: Disconnect internet or invalid API key

**Expected Flow**:
1. API call fails
2. Backend catches error
3. Error response sent to frontend
4. Frontend shows error

**Success Criteria**:
- ✅ No server crash
- ✅ Error logged
- ✅ User notified

---

## Test Execution Checklist

### Prerequisites
- [ ] Backend running on port 5000
- [ ] Frontend running
- [ ] MongoDB connected
- [ ] Redis connected
- [ ] OpenAI API key configured
- [ ] Test data seeded (robots, pathmaps, missions)

### Phase 1: Basic Operations
- [ ] Test 1.1: Execute Mission
- [ ] Test 1.3: Pause Mission
- [ ] Test 1.3: Resume Mission
- [ ] Test 2.1: Create PathMap
- [ ] Test 2.3: Add Station
- [ ] Test 3.1: Create Mission

### Phase 2: Destructive Operations
- [ ] Test 1.2: Abort Mission (with confirmation)
- [ ] Test 2.2: Delete PathMap (with confirmation)
- [ ] Test 2.4: Remove Station (with confirmation)
- [ ] Test 3.2: Delete Mission (with confirmation)

### Phase 3: Disambiguation
- [ ] Test 4.1: Multiple Robots Match
- [ ] Test 4.2: Multiple PathMaps Match
- [ ] Test 4.3: Separator-Agnostic Matching

### Phase 4: Advanced Features
- [ ] Test 5.1: Multi-Turn Conversation
- [ ] Test 5.2: Disambiguation Follow-up
- [ ] Test 6: Text-to-Speech
- [ ] Test 7.1: Entity Not Found
- [ ] Test 7.2: Invalid Audio
- [ ] Test 7.3: API Failure

---

## Test Data Setup

### Sample Robots
```javascript
{
  "_id": "MMR-31",
  "name": "MMR-31",
  "macAddress": "AA:BB:CC:DD:EE:31",
  "robotType": "delivery",
  "status": "Active"
}
```

### Sample PathMaps
```javascript
{
  "name": "office",
  "frame": "lidar",
  "owner": "user@example.com",
  "stations": [
    { "id": "kitchen", "x": 10, "y": 20, "theta": 0 },
    { "id": "home", "x": 0, "y": 0, "theta": 0 }
  ],
  "missions": [
    { "id": "mission-1", "name": "delivery", "path": [] }
  ]
}
```

---

## Known Issues & Limitations

### Phase 1 (Current Implementation)
- ✅ 12 functions fully implemented
- ⚠️ 13 functions stubbed (Phase 2)
- ⚠️ ROS integration assumed (not tested without actual robot)
- ⚠️ MQTT connection optional for testing

### Phase 2 (Future)
- Operator management functions
- QC submission functions
- Issue tracking functions
- Advanced analytics functions

---

## Success Metrics

### Functional Correctness
- 100% of Phase 1 functions work as specified
- Smart disambiguation achieves <5% false positives
- Confirmation dialogs prevent 100% of accidental destructive actions

### User Experience
- Voice transcription accuracy >95%
- Average command execution time <3 seconds
- TTS feedback delivered within 1 second
- Disambiguation resolution in <2 turns

### Reliability
- No crashes during normal operation
- Graceful error handling for all edge cases
- Conversation state maintained across 10-minute window
