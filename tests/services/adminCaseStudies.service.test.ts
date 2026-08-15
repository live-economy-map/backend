import { describe, it } from 'vitest';

describe.skip('adminCaseStudies.service', () => {
  describe('getAllCaseStudies', () => {
    it('returns both published and draft rows when no isPublished filter is given');

    it('applies an isPublished: true filter when requested');

    it('applies an isPublished: false filter when requested');

    it('resolves an empty result, not an error, when there are zero rows');
  });

  describe('createCaseStudy', () => {
    it(
      'resolves dateOrderWarning: false for valid input with no gridCellId and dates in normal order',
    );

    it('resolves successfully when a provided gridCellId exists');

    it('throws ApiError(404, "Grid cell not found") when the provided gridCellId does not exist');

    it(
      'treats scoreRiseDate after confirmedDate as a success with dateOrderWarning: true, not a rejection',
    );

    it('stores unusual date values as-is without silently correcting them');

    it('defaults isPublished to false when omitted from input');

    it('records createdById on the create payload');
  });

  describe('updateCaseStudy', () => {
    it('resolves dateOrderWarning: false on a valid partial update');

    it('throws ApiError(404, "Case study not found") when the case study does not exist');

    it('publishes a draft via isPublished: true — same function used for publishing');

    it(
      're-evaluates dateOrderWarning against the resulting merged record, not just the request fields',
    );

    it('throws ApiError(404, "Grid cell not found") when an updated gridCellId does not exist');
  });

  describe('deleteCaseStudy', () => {
    it('deletes an existing case study by id');

    it('throws ApiError(404, "Case study not found") when the case study does not exist');

    it(
      'performs a genuine hard delete — never prisma.caseStudy.update as a soft-delete substitute',
    );
  });

  describe('searchCaseStudyCandidates', () => {
    it('resolves candidates shaped per API spec 6.2 on a successful search');

    it('resolves an empty candidates array — not an error — when nothing relevant is found');

    it(
      'throws ApiError(400, "Discovery search is temporarily unavailable") when the AI/search service is unreachable',
    );

    it('never calls any prisma.caseStudy write method — regression guard against auto-publish');

    it(
      'resolves an empty candidates array, not a fabricated one, when the AI returns null/malformed output',
    );
  });
});
