import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HardenedMarkdown from './HardenedMarkdown';

describe('HardenedMarkdown', () => {
  describe('Basic markdown rendering', () => {
    it('renders headings correctly', () => {
      render(<HardenedMarkdown>{'# Heading 1\n## Heading 2'}</HardenedMarkdown>);
      
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Heading 1');
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Heading 2');
    });

    it('renders paragraphs and text formatting', () => {
      render(
        <HardenedMarkdown>
          {'This is **bold** and this is *italic*'}
        </HardenedMarkdown>
      );
      
      expect(screen.getByText('bold')).toBeInTheDocument();
      expect(screen.getByText('italic')).toBeInTheDocument();
    });

    it('renders lists correctly', () => {
      const markdown = `
- Item 1
- Item 2

1. First
2. Second
      `;
      
      render(<HardenedMarkdown>{markdown}</HardenedMarkdown>);
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });

    it('renders code blocks', () => {
      const { container } = render(
        <HardenedMarkdown>
          {`\`inline code\`

\`\`\`
block code
\`\`\``}
        </HardenedMarkdown>
      );
      
      expect(screen.getByText('inline code')).toBeInTheDocument();
      // For code blocks, check the pre element exists
      const preElement = container.querySelector('pre');
      expect(preElement).toBeInTheDocument();
      expect(preElement?.textContent).toContain('block code');
    });
  });

  describe('Security properties - Links', () => {
    it('blocks all links when no prefixes are allowed', () => {
      const markdown = '[GitHub](https://github.com)';
      render(<HardenedMarkdown>{markdown}</HardenedMarkdown>);
      
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByText('GitHub [blocked]')).toBeInTheDocument();
    });

    it('allows links with allowed prefixes', () => {
      const markdown = '[GitHub](https://github.com/user/repo)';
      render(
        <HardenedMarkdown allowedLinkPrefixes={['https://github.com/']}>
          {markdown}
        </HardenedMarkdown>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://github.com/user/repo');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('blocks links that do not match allowed prefixes', () => {
      const markdown = `
[Allowed](https://github.com/repo)
[Blocked](https://evil.com/malware)
      `;
      
      render(
        <HardenedMarkdown allowedLinkPrefixes={['https://github.com/']}>
          {markdown}
        </HardenedMarkdown>
      );
      
      expect(screen.getByRole('link')).toHaveTextContent('Allowed');
      expect(screen.getByText('Blocked [blocked]')).toBeInTheDocument();
    });

    it('handles multiple allowed prefixes', () => {
      const markdown = `
[GitHub](https://github.com/repo)
[Docs](https://docs.example.com/page)
[Website](https://www.example.com)
[Blocked](https://malicious.com)
      `;
      
      render(
        <HardenedMarkdown 
          allowedLinkPrefixes={[
            'https://github.com/',
            'https://docs.',
            'https://www.'
          ]}
        >
          {markdown}
        </HardenedMarkdown>
      );
      
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3);
      expect(screen.getByText('Blocked [blocked]')).toBeInTheDocument();
    });
  });

  describe('Security properties - Images', () => {
    it('blocks all images when no prefixes are allowed', () => {
      const markdown = '![Alt text](https://example.com/image.jpg)';
      render(<HardenedMarkdown>{markdown}</HardenedMarkdown>);
      
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByText('[Image blocked: Alt text]')).toBeInTheDocument();
    });

    it('allows images with allowed prefixes', () => {
      const markdown = '![Placeholder](https://via.placeholder.com/150)';
      render(
        <HardenedMarkdown allowedImagePrefixes={['https://via.placeholder.com/']}>
          {markdown}
        </HardenedMarkdown>
      );
      
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://via.placeholder.com/150');
      expect(img).toHaveAttribute('alt', 'Placeholder');
    });

    it('blocks images that do not match allowed prefixes', () => {
      const markdown = `
![Allowed](https://via.placeholder.com/150)
![Blocked](https://evil.com/malware.jpg)
      `;
      
      render(
        <HardenedMarkdown allowedImagePrefixes={['https://via.placeholder.com/']}>
          {markdown}
        </HardenedMarkdown>
      );
      
      expect(screen.getByRole('img')).toHaveAttribute('alt', 'Allowed');
      expect(screen.getByText('[Image blocked: Blocked]')).toBeInTheDocument();
    });

    it('handles images without alt text', () => {
      const markdown = '![](https://example.com/image.jpg)';
      render(<HardenedMarkdown>{markdown}</HardenedMarkdown>);
      
      expect(screen.getByText('[Image blocked: No description]')).toBeInTheDocument();
    });

    it('allows local images with "/" prefix', () => {
      const markdown = '![Logo](/logo.png)';
      render(
        <HardenedMarkdown allowedImagePrefixes={['/']}>
          {markdown}
        </HardenedMarkdown>
      );
      
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/logo.png');
    });
  });

  describe('ReactMarkdown prop compatibility', () => {
    it('accepts standard ReactMarkdown props', () => {
      // Test that it accepts props without error
      const { container } = render(
        <HardenedMarkdown skipHtml={true} unwrapDisallowed={true}>
          {'# Test with <span>HTML</span>'}
        </HardenedMarkdown>
      );
      
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      // HTML should be skipped
      expect(container.textContent).not.toContain('<span>');
    });

    it('accepts and uses custom components', () => {
      const customComponents = {
        h1: ({ children }: any) => <h1 data-testid="custom-h1">{children}</h1>,
      };
      
      render(
        <HardenedMarkdown components={customComponents}>
          {'# Custom Heading'}
        </HardenedMarkdown>
      );
      
      expect(screen.getByTestId('custom-h1')).toHaveTextContent('Custom Heading');
    });

    it('hardened components override user components for security', () => {
      const customComponents = {
        a: ({ children }: any) => <a data-testid="custom-link">{children}</a>,
      };
      
      render(
        <HardenedMarkdown components={customComponents}>
          {'[Link](https://example.com)'}
        </HardenedMarkdown>
      );
      
      // Should use hardened component, not custom one
      expect(screen.queryByTestId('custom-link')).not.toBeInTheDocument();
      expect(screen.getByText('Link [blocked]')).toBeInTheDocument();
    });

    it('accepts remarkPlugins and rehypePlugins', () => {
      // This just tests that the props are accepted without error
      render(
        <HardenedMarkdown
          remarkPlugins={[]}
          rehypePlugins={[]}
        >
          {'# Test'}
        </HardenedMarkdown>
      );
      
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test');
    });
  });

  describe('Edge cases', () => {
    it('handles undefined href in links', () => {
      render(<HardenedMarkdown>{'[No href]()'}</HardenedMarkdown>);
      expect(screen.getByText('No href [blocked]')).toBeInTheDocument();
    });

    it('handles undefined src in images', () => {
      render(<HardenedMarkdown>{'![No src]()'}</HardenedMarkdown>);
      expect(screen.getByText('[Image blocked: No src]')).toBeInTheDocument();
    });

    it('handles complex markdown with mixed allowed/blocked content', () => {
      const markdown = `
# My Document

This has [allowed link](https://github.com/repo) and [blocked link](https://bad.com).

![Allowed image](https://via.placeholder.com/100)
![Blocked image](https://external.com/img.jpg)

> Quote with [another link](https://docs.github.com)
      `;
      
      render(
        <HardenedMarkdown
          allowedLinkPrefixes={['https://github.com/', 'https://docs.']}
          allowedImagePrefixes={['https://via.placeholder.com/']}
        >
          {markdown}
        </HardenedMarkdown>
      );
      
      // Check allowed content
      expect(screen.getAllByRole('link')).toHaveLength(2);
      expect(screen.getByRole('img')).toHaveAttribute('alt', 'Allowed image');
      
      // Check blocked content
      expect(screen.getByText('blocked link [blocked]')).toBeInTheDocument();
      expect(screen.getByText('[Image blocked: Blocked image]')).toBeInTheDocument();
    });
  });
});