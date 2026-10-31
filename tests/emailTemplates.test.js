import { describe, it, expect } from 'vitest';
import { compileEmailPayload, DEFAULT_CHEAT_SHEET_URL } from '../src/services/emailService';

const participant = { email: 'ada@illinois.edu', firstName: 'Ada', lastName: 'L', academicRole: 'Undergraduate Student', status: 'Approved' };
const retreat = { id: 'retreat-1', title: 'SKY Retreat', startDate: '2026-11-06', endDate: '2026-11-08' };
const completion = (settings) => compileEmailPayload('completion', participant, retreat, { whatsAppLink: 'https://chat.whatsapp.com/abc', ...settings }).htmlBody;

describe('completion email cheat sheet', () => {
  it('embeds the site cheat sheet by default', () => {
    const html = completion({});
    expect(html).toContain('Home Practice Cheat Sheet');
    expect(html).toContain(`src="${DEFAULT_CHEAT_SHEET_URL}"`);
    expect(DEFAULT_CHEAT_SHEET_URL).toMatch(/skyhomepracticecheatsheet\.png$/);
  });
  it('uses the configured cheat sheet, embedding Google Drive share links as images', () => {
    expect(completion({ cheatSheetUrl: 'https://skyuiuc.org/assets/new-cheatsheet.jpg' })).toContain('src="https://skyuiuc.org/assets/new-cheatsheet.jpg"');
    expect(completion({ cheatSheetUrl: 'https://drive.google.com/file/d/AbC_123/view?usp=sharing' })).toContain('src="https://lh3.googleusercontent.com/d/AbC_123"');
  });
  it('links (does not embed) a non-image cheat sheet such as a PDF', () => {
    const html = completion({ cheatSheetUrl: 'https://skyuiuc.org/assets/cheatsheet.pdf' });
    expect(html).not.toContain('src="https://skyuiuc.org/assets/cheatsheet.pdf"');
    expect(html).toContain('href="https://skyuiuc.org/assets/cheatsheet.pdf"');
  });
});
