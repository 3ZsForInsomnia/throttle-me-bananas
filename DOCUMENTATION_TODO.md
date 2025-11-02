# Documentation TODO

This file outlines what documentation still needs to be created based on `DOCUMENTATION_PLAN.md`.

## Status

### ✅ Planning Complete
- `TESTING_STRATEGY.md` - Created (unit/integration testing plan)
- `DOCUMENTATION_PLAN.md` - Created (full restructuring plan)
- `TESTING_SETUP.md` - Created (Jest setup instructions)

### 📝 To Be Created

These files need to be written (in priority order):

#### 1. ARCHITECTURE.md (Highest Priority - For AI/Devs)
**Purpose**: Deep dive into how everything works

**Contents** (from DOCUMENTATION_PLAN.md):
- System design philosophy
- Complete data flow diagrams
- Module dependency graph
- Implementation details:
  - Refresh detection algorithm
  - Badge management logic
  - Rolling windows explanation
  - Strict mode implementation
  - Schedule activation
  - Overlap detection algorithm
- Performance considerations
- Security considerations
- Extensibility guide

**Why first**: Provides complete mental model for AI assistants and developers

---

#### 2. DEVELOPMENT.md (High Priority - For Devs)
**Purpose**: Developer onboarding and setup

**Contents**:
- Quick start for developers
- Architecture overview (high-level)
- Project structure (merge from FILE_STRUCTURE.md)
- Core concepts (URL matching, rolling windows, strict mode, schedules)
- Testing guide
- Making changes (common tasks)
- Chrome extension specifics

**Action**: Merge content from `FILE_STRUCTURE.md` into this

---

#### 3. USER_GUIDE.md (High Priority - For Users)
**Purpose**: End-user documentation with screenshots

**Contents**:
- What is this?
- Installation
- Creating rules (step-by-step with screenshots)
- Schedules
- Common scenarios
- Import/export
- Troubleshooting
- FAQ

**Needs**: Screenshots from settings page

---

#### 4. API_REFERENCE.md (Medium Priority - For Devs)
**Purpose**: Complete function documentation

**Contents**:
- All exported functions organized by module
- Full JSDoc-style documentation
- Parameters, return values, examples
- Type definitions (merge from STORAGE_SCHEMA.md)

**Action**: Merge content from `STORAGE_SCHEMA.md` into this

---

#### 5. Simplify README.md (Medium Priority)
**Purpose**: Clean project overview

**Keep**:
- Project description
- Key features (bullets)
- Quick start (3 steps)
- Links to other docs

**Remove**:
- Detailed feature explanations → USER_GUIDE.md
- Development status details → DEVELOPMENT.md
- Technical details → ARCHITECTURE.md

---

### 🗑️ To Be Removed/Merged

After new docs are created:

- ❌ `FILE_STRUCTURE.md` → merge into DEVELOPMENT.md
- ❌ `STORAGE_SCHEMA.md` → merge into API_REFERENCE.md
- ❌ `YOU_ARE_HERE.md` → info goes into README.md status
- ❌ `QUICK_START.md` → merge into USER_GUIDE.md

---

## Implementation Order

### Phase 1: Essential Docs (Do These First)
1. Create `ARCHITECTURE.md` (helps AI, helps devs)
2. Create `DEVELOPMENT.md` (dev onboarding)
3. Simplify `README.md`

### Phase 2: User Experience (Do Second)
4. Create `USER_GUIDE.md` with screenshots
5. Remove old redundant files

### Phase 3: Reference Material (Do Later)
6. Create `API_REFERENCE.md`
7. Final cleanup

---

## What Each File Provides

### For AI Assistants
- **ARCHITECTURE.md** ← Complete mental model, data flow, edge cases
- **DEVELOPMENT.md** ← High-level structure and concepts
- **API_REFERENCE.md** ← Function signatures and types

### For Developers (You)
- **DEVELOPMENT.md** ← Quick start and common tasks
- **ARCHITECTURE.md** ← Deep understanding
- **TESTING_STRATEGY.md** ← What and how to test
- **API_REFERENCE.md** ← Function reference

### For End Users
- **USER_GUIDE.md** ← Complete user manual
- **README.md** ← Quick overview
- **TROUBLESHOOTING.md** ← Debug help

---

## Screenshot Needs (for USER_GUIDE.md)

### Settings Page Screenshots
1. Empty state (no rules)
2. Creating first rule
3. Rule configuration form (all fields visible)
4. Schedule selector
5. Adding sites
6. Overlap warning
7. Import/export buttons
8. Statistics dashboard

### Blocked Page Screenshot
1. Blocked page showing countdown

### Badge Screenshots
1. Badge showing green (3+)
2. Badge showing yellow (1-2)
3. Badge showing red (0)
4. No badge (untracked site)

---

## Quick Summary

**Created**: 3 planning/strategy docs
**To Create**: 4 main docs (ARCHITECTURE, DEVELOPMENT, USER_GUIDE, API_REFERENCE)
**To Update**: 1 (README.md - simplify)
**To Remove**: 4 (FILE_STRUCTURE, STORAGE_SCHEMA, YOU_ARE_HERE, QUICK_START)

**Total Effort**: ~4-6 hours of writing + screenshots

---

## When to Do This

**Option 1**: Do it now while context is fresh

**Option 2**: Do it after Phase 10 testing (validate all details)

**Option 3**: Do it incrementally as needed

**Recommendation**: Create ARCHITECTURE.md now (helps AI), rest can wait.

---

See `DOCUMENTATION_PLAN.md` for complete details and content outlines.
