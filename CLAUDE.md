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

Full template available in `.claude/principles.md`
