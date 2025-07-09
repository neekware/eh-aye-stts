---
# Code Optimization Review Template
---

## 📋 Pre-Implementation Review

**Feature:** [Name of feature/change]  
**Date:** [Current date]  
**Developer:** Claude Code

---

### 1. LEVER Analysis

#### Locate (0–2 points): [ ]

- [ ] Searched for similar implementations
- [ ] Found patterns to reuse
- [ ] Documented findings

**Similar code found:**

```
[List files and patterns discovered]
```

#### Extend (0–2 points): [ ]

- [ ] Identified extension points
- [ ] Planned minimal changes
- [ ] Reusing existing components

**Extension strategy:**

```
[Describe how existing code will be extended]
```

#### Validate (0–2 points): [ ]

- [ ] Checked backward compatibility post version 1.1 ONLY
- [ ] Identified affected components
- [ ] Planned testing approach

**Compatibility notes:**

```
[List compatibility considerations]
```

#### Enhance (0–2 points): [ ]

- [ ] Performance improvements identified
- [ ] Optimization opportunities listed
- [ ] Benchmarks planned

**Enhancement targets:**

```
[List performance improvements]
```

#### Reduce (0–2 points): [ ]

- [ ] Code reduction estimated
- [ ] Complexity simplified
- [ ] Duplication eliminated

**Reduction metrics:**

```
Initial LOC: [number]
Target LOC: [number]
Reduction: [percentage]
```

---

### 2. Decision Framework Score

**Total LEVER Score:** [ ] / 10 _(minimum 7 required)_

**Decision Questions:**

1. Can I extend an existing table? [Yes/No]
2. Can I add to an existing query? [Yes/No]
3. Can I enhance an existing hook? [Yes/No]
4. Can I modify an existing component? [Yes/No]

---

### 3. Implementation Plan

**Approved to proceed?** [Yes/No]

**Implementation approach:**

1. [Step 1]
2. [Step 2]
3. [Step 3]

**Risk mitigation:**

- **[Risk 1]:** [Mitigation]
- **[Risk 2]:** [Mitigation]

---

## 📊 Post-Implementation Review

### Actual Metrics

**Code Metrics:**

- Initial LOC: [number]
- Final LOC: [number]
- Actual reduction: [percentage]
- Files modified: [number]
- Files created: [number]

**Performance Metrics:**

- Execution time: [before] → [after]
- Memory usage: [before] → [after]
- Test coverage: [percentage]

---

### Lessons Learned

**What worked well:**

- [Success 1]
- [Success 2]

**What could improve:**

- [Improvement 1]
- [Improvement 2]

**Patterns to document:**

- [Pattern 1]
- [Pattern 2]

---

### Team Notes

**Architectural decisions:**

```
[Document key decisions and reasoning]
```

**Future considerations:**

```
[Note future optimization opportunities]
```

---

**Review completed by:** Claude Code  
**Review date:** [Date]  
**Approval status:** [Approved / Needs revision]
