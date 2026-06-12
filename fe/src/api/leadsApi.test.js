import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { clearAuthSession, setAuthSession } from '../features/auth/authSession.js';
import { normalizeApiError } from './normalizeApiError.js';
import { getLeadsBySourceReport, getPipelineSummaryReport } from './reportsApi.js';
import { getLeadStageTimer, getLeadTimeline, getLeads, updateLeadStage } from './leadsApi.js';
import { handlers, resetMockState } from '../shared/mocks/handlers.js';
import { mockAccessToken, mockAuthUser } from '../shared/mocks/authMockData.js';

const apiBaseUrl = 'http://localhost:5000';
const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error',
  });
});

afterEach(() => {
  resetMockState();
  clearAuthSession();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('leadsApi', () => {
  it('fetches filtered leads through the shared API module', async () => {
    setAuthSession({
      accessToken: mockAccessToken,
      user: mockAuthUser,
    });

    const result = await getLeads({
      search: 'solar',
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe('lead-1');
    expect(result.items[0].title).toContain('Solar');
  });

  it('normalizes API errors', async () => {
    setAuthSession({
      accessToken: mockAccessToken,
      user: mockAuthUser,
    });

    server.use(
      http.get(`${apiBaseUrl}/api/leads`, () =>
        HttpResponse.json(
          {
            message: 'CRM service is unavailable.',
          },
          {
            status: 503,
          },
        ),
      ),
    );

    try {
      await getLeads();
    } catch (error) {
      const normalized = normalizeApiError(error);

      expect(normalized.message).toBe('CRM service is unavailable.');
      expect(normalized.status).toBe(503);
      return;
    }

    throw new Error('Expected getLeads to throw an API error.');
  });

  it('updates the stage timer and timeline when a lead changes stage', async () => {
    setAuthSession({
      accessToken: mockAccessToken,
      user: mockAuthUser,
    });

    await updateLeadStage('lead-1', {
      stageId: 'stage-3',
    });

    const timeline = await getLeadTimeline('lead-1');
    const stageTimer = await getLeadStageTimer('lead-1');
    const latestStageEvent = timeline.find((event) => event.title === 'Moved to Proposal');

    expect(latestStageEvent).toMatchObject({
      activityType: 'StageChanged',
      metadata: {
        fromStage: 'Qualified',
        toStage: 'Proposal',
      },
    });
    expect(stageTimer.currentStageName).toBe('Proposal');
    expect(stageTimer.daysInCurrentStage).toBe(0);
    expect(stageTimer.previousStages.at(-1)).toMatchObject({
      stageName: 'Qualified',
    });
  });

  it('recomputes report data from the live mock CRM state', async () => {
    setAuthSession({
      accessToken: mockAccessToken,
      user: mockAuthUser,
    });

    await updateLeadStage('lead-3', {
      stageId: 'stage-5',
    });

    const pipelineSummary = await getPipelineSummaryReport();
    const leadsBySource = await getLeadsBySourceReport();
    const wonStage = pipelineSummary.find((stage) => stage.stageName === 'Won');
    const organicSearchSource = leadsBySource.find((source) => source.source === 'Organic Search');

    expect(wonStage).toMatchObject({
      leadCount: 1,
      totalEstimatedValue: 6400,
    });
    expect(organicSearchSource).toMatchObject({
      openLeads: 0,
      wonLeads: 1,
      estimatedValue: 6400,
    });
  });
});
