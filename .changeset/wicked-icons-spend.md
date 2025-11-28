---
"harden-react-markdown": patch
---

Ensure `harden` plugin comes at the end so that additional nodes coming from plugins like rehype-raw are also sanitized.
