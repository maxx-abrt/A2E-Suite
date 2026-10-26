import { LogicFunctionDriverType } from 'src/engine/core-modules/logic-function/logic-function-drivers/interfaces/logic-function-driver.interface';
import { LogicFunctionExecutorService } from 'src/engine/core-modules/logic-function/logic-function-executor/logic-function-executor.service';

const buildService = (
  apiUrl: string | undefined,
  driverType: LogicFunctionDriverType,
) => {
  const execute = jest.fn().mockResolvedValue({ logs: [] });
  const generateApplicationAccessToken = jest
    .fn()
    .mockResolvedValue({ token: 'application-token' });
  const service = new LogicFunctionExecutorService(
    { getCurrentDriver: () => ({ execute }) } as never,
    { tokenBucketThrottleOrThrow: jest.fn() } as never,
    {
      get: (key: string) =>
        ({
          LOGIC_FUNCTION_LOCAL_API_URL: apiUrl,
          LOGIC_FUNCTION_TYPE: driverType,
          SERVER_URL: 'https://bureau.example.com',
        })[key],
    } as never,
    {} as never,
    { generateApplicationAccessToken } as never,
    {} as never,
    { getServerEnvVariables: jest.fn().mockResolvedValue({}) } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { isFeatureEnabled: jest.fn().mockResolvedValue(false) } as never,
    {
      buildPublicFunctionBaseUrl: () =>
        'https://bureau.example.com/s/functions',
    } as never,
    { findPrimaryPublicDomainName: jest.fn().mockResolvedValue(null) } as never,
    { isApplicationStopped: jest.fn().mockResolvedValue(false) } as never,
    {
      findOne: jest.fn().mockResolvedValue({ subdomain: 'workspace' }),
    } as never,
    {} as never,
  );
  const internals = service as unknown as Record<string, jest.Mock>;

  jest.spyOn(internals, 'getFlatEntitiesOrThrow').mockResolvedValue({
    flatApplication: {
      id: 'application-id',
      universalIdentifier: 'application-identifier',
      applicationRegistrationId: null,
    },
    flatLogicFunction: { id: 'hook-id', timeoutSeconds: 120 },
    applicationVariableMaps: {},
  });
  jest.spyOn(internals, 'buildExecutionContext').mockResolvedValue({});
  jest.spyOn(internals, 'handleExecutionResult').mockResolvedValue(undefined);

  return { service, execute, generateApplicationAccessToken };
};

describe('Logic function API routing', () => {
  it.each([
    [
      'http://server:3000/',
      'http://server:3000',
      LogicFunctionDriverType.LOCAL,
    ],
    [undefined, 'https://bureau.example.com', LogicFunctionDriverType.LOCAL],
    [
      'http://server:3000',
      'https://bureau.example.com',
      LogicFunctionDriverType.LAMBDA,
    ],
  ])(
    'sends authenticated SDK calls to %s while keeping public function links',
    async (apiUrl, expectedUrl, driverType) => {
      const { service, execute, generateApplicationAccessToken } = buildService(
        apiUrl,
        driverType,
      );

      await service.execute({
        logicFunctionId: 'hook-id',
        workspaceId: 'workspace-id',
        payload: {},
      });

      expect(execute).toHaveBeenCalledWith(
        expect.objectContaining({
          env: expect.objectContaining({
            TWENTY_API_URL: expectedUrl,
            TWENTY_APP_ACCESS_TOKEN: 'application-token',
            TWENTY_FUNCTIONS_URL: 'https://bureau.example.com/s/functions',
          }),
        }),
      );
      expect(generateApplicationAccessToken).toHaveBeenCalledWith({
        workspaceId: 'workspace-id',
        applicationId: 'application-id',
      });
    },
  );
});
