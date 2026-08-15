import { describe, it } from 'vitest';

describe.skip('adminCaseStudies.controller', () => {
  describe('listAllCaseStudies', () => {
    it('delegates to getAllCaseStudies with query params and responds 200');
  });

  describe('createCaseStudy', () => {
    it('responds 201 with "Case study created" when there is no date-order warning');

    it('responds 201 with the date-order-warning message when dateOrderWarning is true');

    it('propagates a 404 grid-cell-not-found error via next, unchanged');
  });

  describe('updateCaseStudy', () => {
    it('responds 200 with the warning-branch message when dateOrderWarning is true');

    it('responds 200 with the normal (non-warning) message when dateOrderWarning is false');

    it('propagates a 404 case-study-not-found error via next, unchanged');
  });

  describe('deleteCaseStudy', () => {
    it('delegates to deleteCaseStudy and responds 200 with an empty data payload');
  });

  describe('discoverCandidates', () => {
    it('responds 200 with message "OK" when candidates are found');

    it(
      'responds 200 (not an error status) with "No relevant candidates found" when candidates is empty',
    );

    it('propagates the 400 discovery-unavailable error via next, unchanged');
  });
});
