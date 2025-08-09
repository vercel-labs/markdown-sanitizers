# Markdown sanitizers

This repository contains 2 related npm packages concerned with hardening markdown against [data exfiltration attacks through LLM prompt-injection](https://vercel.com/blog/building-secure-ai-agents#exfiltration-through-model-output).

The 2 projects which address 2 different use cases:

1. You render the markdown to HTML yourself
2. You're giving the markdown to a third-party such as GitHub or GitLab where you don't control the rendering

## You render the markdown to HTML yourself

This is the more common use-case. It's also the variant that is easier to secure, because you have full control over the process.
[harden-react-markdown](https://github.com/vercel/harden-react-markdown/tree/main/harden-react-markdown) is a wrapper for the
popular `react-markdown` package giving it more secure defaults, and giving you the ability to allow-list URL prefixes in images
and links.

## 2. You're giving the markdown to a third-party such as GitHub or GitLab where you don't control the rendering

We created [markdown-to-markdown-sanitizer](https://github.com/vercel/harden-react-markdown/tree/main/markdown-to-markdown-sanitizer) for this
use-case. Generally speaking, this is less secure than sanitizing the final rendered output such as the generated HTML. Hence, this package 
should only be used when the markdown is rendered by a third-party such as GitHub or GitLab.

## Security properties

The packages in this repository have subtle security properties. Use at your own risk (see LICENSE) and perform your own security testing for specific application.
