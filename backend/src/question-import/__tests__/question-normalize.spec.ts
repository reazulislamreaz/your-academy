import {
  answerSnippet,
  hashQuestionContent,
  hashQuestionIdentity,
  normalizeAnswerText,
  normalizeQuestionText,
  resolveCorrectOptionContent,
  stripSimpleHtml,
} from '../question-normalize';

describe('question-normalize', () => {
  describe('normalizeQuestionText', () => {
    it('trims, collapses spaces, NFC, and Latin casefolds', () => {
      expect(normalizeQuestionText('  What   IS   the Capital?  ')).toBe(
        'what is the capital?',
      );
    });

    it('strips simple HTML without removing punctuation or math symbols', () => {
      expect(normalizeQuestionText('<p>What is 2+2?</p>')).toBe('what is 2+2?');
      expect(normalizeQuestionText('a&nbsp;b<br/>c')).toBe('a b c');
    });

    it('keeps Bangla content stable under NFC', () => {
      const bn = 'বাংলাদেশের রাজধানী কোনটি?';
      expect(normalizeQuestionText(bn)).toBe(bn);
    });
  });

  describe('hashQuestionIdentity', () => {
    it('flags same question + same answer as identical', () => {
      const a = hashQuestionIdentity('What is the capital of Bangladesh?', 'Dhaka');
      const b = hashQuestionIdentity(
        '  what   is the capital of Bangladesh? ',
        '  DHAKA ',
      );
      expect(a).toBe(b);
    });

    it('does not treat same question + different answer as identical', () => {
      const dhaka = hashQuestionIdentity('What is the capital of Bangladesh?', 'Dhaka');
      const ctg = hashQuestionIdentity('What is the capital of Bangladesh?', 'Chittagong');
      expect(dhaka).not.toBe(ctg);
    });

    it('does not treat different question + same answer as identical', () => {
      const a = hashQuestionIdentity('What is the capital of Bangladesh?', 'Dhaka');
      const b = hashQuestionIdentity('Which city is the capital of Bangladesh?', 'Dhaka');
      expect(a).not.toBe(b);
    });

    it('ignores correct-option letter/order by hashing answer content', () => {
      const viaA = hashQuestionIdentity('Capital?', resolveCorrectOptionContent('A', {
        A: 'Dhaka',
        B: 'Chittagong',
        C: 'Khulna',
        D: 'Rajshahi',
      }));
      const viaB = hashQuestionIdentity('Capital?', resolveCorrectOptionContent('B', {
        A: 'Chittagong',
        B: 'Dhaka',
        C: 'Khulna',
        D: 'Rajshahi',
      }));
      expect(viaA).toBe(viaB);
    });

    it('differs from legacy text-only hashes', () => {
      const textOnly = hashQuestionContent('What is the capital of Bangladesh?');
      const identity = hashQuestionIdentity('What is the capital of Bangladesh?', 'Dhaka');
      expect(identity).not.toBe(textOnly);
    });
  });

  describe('helpers', () => {
    it('stripSimpleHtml decodes common entities', () => {
      expect(stripSimpleHtml('A &amp; B &lt; C')).toBe('A & B < C');
    });

    it('normalizeAnswerText matches question rules', () => {
      expect(normalizeAnswerText('  Dhaka  ')).toBe('dhaka');
    });

    it('answerSnippet truncates long answers', () => {
      const long = 'x'.repeat(80);
      expect(answerSnippet(long).endsWith('…')).toBe(true);
      expect(answerSnippet('Dhaka')).toBe('dhaka');
    });
  });
});
