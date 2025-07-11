# LEVER Principles

This project follows the LEVER optimization framework. Before implementing any new feature:

1. **Locate** - Search for similar implementations to reuse
2. **Extend** - Use existing extension points instead of creating new code
3. **Validate** - Check backward compatibility (post v1.1 only)
4. **Enhance** - Identify performance improvements
5. **Reduce** - Minimize code complexity and duplication

**Minimum LEVER score: 7/10 required before proceeding**

## Quick Checks Before Coding:

- Can I extend an existing table?
- Can I add to an existing query?
- Can I enhance an existing hook?
- Can I modify an existing component?

If any answer is "Yes", use that approach instead of creating new code.

## Pre-Release Rule: NO DEPRECATION

Since we haven't released v1.0 yet, NEVER add DEPRECATED comments or backward compatibility layers.
Simply replace, update, and improve code directly. Clean removal is better than deprecation warnings.

Full template available in `.claude/principles.md`
