---
"rehype-harden": patch
"harden-react-markdown": patch
---

Preserve the resolved path for relative URLs whose normalized pathname begins with an empty segment (for example `/.//foo/bar` or `/a/..//foo/bar`). These are now emitted as `/.//foo/bar` so that they keep resolving to the same path on the same origin.
