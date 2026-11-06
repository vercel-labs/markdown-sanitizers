---
"harden-react-markdown": patch
---

Preserve explicitly allowed custom-protocol links after `rehype-harden` validates them, while retaining React Markdown's default URL checks for other attributes.
