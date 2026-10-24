import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as savedAreasService from '../../src/services/savedAreas.service.js';
import * as savedAreasController from '../../src/controllers/savedAreas.controller.js';
import { HTTP_STATUS } from '../../src/constants/index.js';

vi.mock('../../src/services/savedAreas.service.js', () => ({
  listSavedAreas: vi.fn(),
  createSavedArea: vi.fn(),
  updateSavedArea: vi.fn(),
  deleteSavedArea: vi.fn(),
}));

describe('savedAreas.controller', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { user: { id: 'user-1' }, params: {}, body: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it('listSavedAreas returns 200 with saved areas list', async () => {
    const mockList = [{ id: 'area-1', customName: 'Saved Cell' }];
    vi.mocked(savedAreasService.listSavedAreas).mockResolvedValue(mockList as any);

    await savedAreasController.listSavedAreas(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockList }));
  });

  it('createSavedArea returns 201 with created record', async () => {
    const mockCreated = { id: 'area-1', gridCellId: 'cell-1' };
    vi.mocked(savedAreasService.createSavedArea).mockResolvedValue(mockCreated as any);
    req.body = { gridCellId: 'cell-1' };

    await savedAreasController.createSavedArea(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockCreated }));
  });

  it('updateSavedArea returns 200 with updated record', async () => {
    const mockUpdated = { id: 'area-1', customName: 'New Label' };
    vi.mocked(savedAreasService.updateSavedArea).mockResolvedValue(mockUpdated as any);
    req.params = { id: 'area-1' };
    req.body = { customName: 'New Label' };

    await savedAreasController.updateSavedArea(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockUpdated }));
  });

  it('deleteSavedArea returns 200 with message', async () => {
    vi.mocked(savedAreasService.deleteSavedArea).mockResolvedValue({
      message: 'Saved area deleted successfully',
    });
    req.params = { id: 'area-1' };

    await savedAreasController.deleteSavedArea(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
  });
});
