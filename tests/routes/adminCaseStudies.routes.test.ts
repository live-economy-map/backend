import { describe, it } from 'vitest';

describe.skip('adminCaseStudies.routes', () => {
  describe('every route requires auth', () => {
    it('GET / returns 401 without an Authorization header, controller mock never invoked');

    it('POST / returns 401 without an Authorization header, controller mock never invoked');

    it(
      'PATCH /:caseStudyId returns 401 without an Authorization header, controller mock never invoked',
    );

    it(
      'DELETE /:caseStudyId returns 401 without an Authorization header, controller mock never invoked',
    );

    it('POST /discover returns 401 without an Authorization header, controller mock never invoked');
  });

  describe('POST / validates body against createCaseStudySchema', () => {
    it('rejects an empty body — controller mock never called');
  });

  describe('PATCH /:caseStudyId validates the uuid param', () => {
    it('rejects a malformed caseStudyId with a valid body — controller mock never called');
  });

  describe('DELETE /:caseStudyId has no body schema', () => {
    it('reaches the controller mock even with a malformed id — service is responsible for the 404');
  });

  describe('POST /discover validates areaFocus', () => {
    it('rejects an empty areaFocus — controller mock never called');
  });

  describe('happy paths — authorized, valid input reaches the controller', () => {
    it('GET / returns 200');

    it('POST / returns 201 with a valid body');

    it('PATCH /:caseStudyId returns 200 with a valid uuid and body');

    it('DELETE /:caseStudyId returns 200 with a valid uuid');

    it('POST /discover returns 200 with a valid areaFocus');
  });
});
