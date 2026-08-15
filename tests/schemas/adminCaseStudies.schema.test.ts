import { describe, it } from 'vitest';

// Per 09-test-file-specification/backend/9-7-case-study-curation.md, section 9.2
// Per 08-function-level-specification/backend/8-7-case-study-curation.md, schema table

describe.skip('adminCaseStudies.schema', () => {
  describe('createCaseStudySchema', () => {
    it('requires name, coordinates, evidenceDescription, and both dates');

    it('accepts the minimal valid shape');

    it('defaults isPublished to false');

    it('leaves gridCellId undefined when not provided');

    it('leaves evidenceUrl undefined when not provided');

    it('leaves evidenceTier undefined when not provided');

    it('leaves beforeImageUrl undefined when not provided');

    it('leaves afterImageUrl undefined when not provided');

    it('rejects an invalid evidenceUrl');

    it('rejects a malformed gridCellId');

    it(
      'does not itself reject scoreRiseDate after confirmedDate (service-level warning, not a schema rejection)',
    );

    it('accepts a valid evidenceTier enum value');

    it('rejects an invalid evidenceTier value');
  });

  describe('updateCaseStudySchema', () => {
    it('treats all body fields as optional — confirms the partial-update shape');

    it('requires a valid uuid caseStudyId param');

    it('accepts a partial body with a valid caseStudyId');
  });

  describe('discoverBodySchema', () => {
    it('requires a non-empty areaFocus');

    it('accepts a valid areaFocus');
  });
});
