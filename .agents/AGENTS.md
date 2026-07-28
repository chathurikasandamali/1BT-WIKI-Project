# 1BT-WIKI-Project — Agent Rules

## Code Style

### Use Named Booleans for Compound Conditions in JSX

Never write inline compound boolean expressions directly inside JSX conditionals.
Instead, extract them into a clearly named `const` before the `return` statement.

**❌ Don't do this:**

```tsx
{
  article.status === 'Draft' || article.status === 'Rejected' ? (
    <EditLink />
  ) : (
    <DisabledButton />
  );
}
```

**✅ Do this instead:**

```tsx
const canEdit = article.status === 'Draft' || article.status === 'Rejected';

// ...

{
  canEdit ? <EditLink /> : <DisabledButton />;
}
```

This applies to any multi-part condition (two or more `&&` / `||` operands) used as a JSX conditional, including ternaries and short-circuit renders (`condition && <Component />`).
