import { describe, it, expect, jest } from '@jest/globals';
import { extractDomain, extractPath, matchesSitePattern } from '../../src/utils/url-matcher.js';

describe('url-matcher', () => {
  describe('extractDomain', () => {
    it('extracts domain from valid HTTPS URL', () => {
      expect(extractDomain('https://discord.com/channels')).toBe('discord.com');
      expect(extractDomain('https://www.example.com')).toBe('www.example.com');
    });

    it('extracts domain from valid HTTP URL', () => {
      expect(extractDomain('http://example.com')).toBe('example.com');
    });

    it('extracts subdomain correctly', () => {
      expect(extractDomain('https://mail.google.com')).toBe('mail.google.com');
      expect(extractDomain('https://sub.domain.example.com')).toBe('sub.domain.example.com');
    });

    it('handles URLs with ports', () => {
      expect(extractDomain('https://localhost:3000')).toBe('localhost');
      expect(extractDomain('https://example.com:8080/path')).toBe('example.com');
    });

    it('returns empty string for invalid URLs', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(extractDomain('not a url')).toBe('');
      expect(extractDomain('')).toBe('');
      expect(extractDomain('just-text')).toBe('');
      
      consoleErrorSpy.mockRestore();
    });

    it('handles edge cases', () => {
      expect(extractDomain('https://example.com/')).toBe('example.com');
      expect(extractDomain('https://example.com')).toBe('example.com');
    });
  });

  describe('extractPath', () => {
    it('extracts path from URL', () => {
      expect(extractPath('https://discord.com/channels/123')).toBe('/channels/123');
      expect(extractPath('https://example.com/path/to/page')).toBe('/path/to/page');
    });

    it('returns / for root URLs', () => {
      expect(extractPath('https://example.com')).toBe('/');
      expect(extractPath('https://example.com/')).toBe('/');
    });

    it('handles query parameters', () => {
      expect(extractPath('https://example.com/search?q=test')).toBe('/search');
    });

    it('handles hash fragments', () => {
      expect(extractPath('https://example.com/page#section')).toBe('/page');
    });

    it('returns empty string for invalid URLs', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(extractPath('not a url')).toBe('');
      expect(extractPath('')).toBe('');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('matchesSitePattern', () => {
    describe('domain-only patterns', () => {
      it('matches exact domain', () => {
        expect(matchesSitePattern('https://discord.com', 'discord.com')).toBe(true);
        expect(matchesSitePattern('https://discord.com/any/path', 'discord.com')).toBe(true);
      });

      it('matches subdomains', () => {
        expect(matchesSitePattern('https://mail.google.com', 'google.com')).toBe(true);
        expect(matchesSitePattern('https://www.example.com', 'example.com')).toBe(true);
      });

      it('does not match different domains', () => {
        expect(matchesSitePattern('https://example.com', 'discord.com')).toBe(false);
        expect(matchesSitePattern('https://notdiscord.com', 'discord.com')).toBe(false);
      });

      it('does not match partial domain strings', () => {
        expect(matchesSitePattern('https://mydiscord.com', 'discord.com')).toBe(false);
        expect(matchesSitePattern('https://discordapp.com', 'discord.com')).toBe(false);
      });
    });

    describe('path-specific patterns', () => {
      it('matches exact path', () => {
        expect(matchesSitePattern('https://discord.com/channels', 'discord.com/channels')).toBe(true);
      });

      it('matches paths with deeper nesting', () => {
        expect(matchesSitePattern('https://discord.com/channels/123/456', 'discord.com/channels')).toBe(true);
      });

      it('does not match different paths', () => {
        expect(matchesSitePattern('https://discord.com/settings', 'discord.com/channels')).toBe(false);
        expect(matchesSitePattern('https://discord.com/other', 'discord.com/channels')).toBe(false);
      });

      it('does not match partial path strings', () => {
        expect(matchesSitePattern('https://discord.com/channelsettings', 'discord.com/channels')).toBe(false);
      });

      it('handles paths without leading slash', () => {
        expect(matchesSitePattern('https://example.com/path/to/page', 'example.com/path')).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('returns false for empty pattern', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        expect(matchesSitePattern('https://example.com', '')).toBe(false);
        
        consoleErrorSpy.mockRestore();
      });

      it('returns false for empty URL', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        expect(matchesSitePattern('', 'example.com')).toBe(false);
        
        consoleErrorSpy.mockRestore();
      });

      it('returns false for both empty', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        expect(matchesSitePattern('', '')).toBe(false);
        
        consoleErrorSpy.mockRestore();
      });

      it('handles complex paths', () => {
        expect(matchesSitePattern(
          'https://github.com/user/repo/issues/123',
          'github.com/user/repo'
        )).toBe(true);
      });
    });
  });
});
