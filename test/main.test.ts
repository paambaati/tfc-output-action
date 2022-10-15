import test from 'tape';
import nock from 'nock';
import toReadableStream from 'to-readable-stream';
import { default as hookStd } from 'hook-std';
import sinon from 'sinon';
import { readFile, mkdtempSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { promisify } from 'util';
import { run } from '../src/main';

/**
 * Dev Notes
 *
 * 1. `stdHook.unhook()` is called at the end of both `try` and `catch`
 * instead of once in `finally` specifically because the hook is still
 * capturing stdout/stderr, and so if there's some error, it can still
 * be printed on the screen. If the unhook method is moved to `finally`,
 * it will capture, i.e. swallow and not print, error traces.
 * */

const readFileAsync = promisify(readFile);
const sandbox = sinon.createSandbox();

const createTempFile = (fileName: string): string => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'test-tfc-output-action-'));
  const filePath = join(tmpDir, sep, fileName);
  closeSync(openSync(filePath, 'wx'));
  return filePath;
};

const mockGithubOutputEnvironment = (): void => {
  const tempFilePath = createTempFile('MOCK_GITHUB_OUTPUT');
  process.env.GITHUB_OUTPUT = tempFilePath;
};

const unmockGithubOutputEnvironment = (): void => {
  const tempFilePath = process.env.GITHUB_OUTPUT as string;
  unlinkSync(tempFilePath);
  process.env.GITHUB_OUTPUT = '';
};

const isRunningInGithubActions = (): boolean =>
  process.env.GITHUB_ACTIONS === 'true';

test('🛠 setup', (t) => {
  nock.disableNetConnect();
  if (!nock.isActive()) nock.activate();
  if (isRunningInGithubActions()) mockGithubOutputEnvironment();
  t.end();
});

test('🧪 run() should retrieve the output variable from Terraform Cloud and make it available as an action output (and mask sensitive variables).', async (t) => {
  t.plan(1);
  t.teardown(() => sandbox.restore());

  const input = {
    apiToken: 'xxx',
    workspaceId: 'ws-123',
    variableName: 'abc',
  };
  nock(`https://app.terraform.io`, {
    reqheaders: {
      'content-type': 'application/vnd.api+json',
      authorization: `Bearer ${input.apiToken}`,
    },
  })
    .get(
      `/api/v2/workspaces/${input.workspaceId}/current-state-version?include=outputs`
    )
    .reply(200, async () => {
      const dummyAPIResponseFile = './test/fixtures/tfc-output-happy-path.json';
      const dummyAPIResponse = await readFileAsync(dummyAPIResponseFile);
      return toReadableStream(dummyAPIResponse);
    });

  let capturedOutput = '';
  const stdHook = hookStd((text: string) => {
    capturedOutput += text;
  });

  try {
    await run(input.apiToken, input.workspaceId, input.variableName);
    stdHook.unhook();
  } catch (err) {
    stdHook.unhook();
    t.fail(err);
  } finally {
    nock.cleanAll();
  }

  t.equal(
    capturedOutput,
    // prettier-ignore
    `::debug::ℹ️ Fetching state output from Terraform Cloud API for workspace ID ws-123 and variable name abc ...
::add-mask::value

::set-output name=value::xyz
::debug::✅ Output variable found!
`,
    'should execute all steps.'
  );
  nock.cleanAll();
  t.end();
});

test('🧪 run() should retrieve the output variable from Terraform Cloud and make it available as an action output (and not mask non-sensitive variables).', async (t) => {
  t.plan(1);
  t.teardown(() => sandbox.restore());

  const input = {
    apiToken: 'xxx',
    workspaceId: 'ws-123',
    variableName: 'abc',
  };
  nock(`https://app.terraform.io`, {
    reqheaders: {
      'content-type': 'application/vnd.api+json',
      authorization: `Bearer ${input.apiToken}`,
    },
  })
    .get(
      `/api/v2/workspaces/${input.workspaceId}/current-state-version?include=outputs`
    )
    .reply(200, async () => {
      const dummyAPIResponseFile =
        './test/fixtures/tfc-output-non-sensitive.json';
      const dummyAPIResponse = await readFileAsync(dummyAPIResponseFile);
      return toReadableStream(dummyAPIResponse);
    });

  let capturedOutput = '';
  const stdHook = hookStd((text: string) => {
    capturedOutput += text;
  });

  try {
    await run(input.apiToken, input.workspaceId, input.variableName);
    stdHook.unhook();
  } catch (err) {
    stdHook.unhook();
    t.fail(err);
  } finally {
    nock.cleanAll();
  }

  t.equal(
    capturedOutput,
    // prettier-ignore
    `::debug::ℹ️ Fetching state output from Terraform Cloud API for workspace ID ws-123 and variable name abc ...

::set-output name=value::xyz-non-sensitive
::debug::✅ Output variable found!
`,
    'should execute all steps.'
  );
  nock.cleanAll();
  t.end();
});

test('🧪 run() should display an appropriate error if validation of the workspace ID input fails.', async (t) => {
  t.plan(1);
  t.teardown(() => sandbox.restore());

  const input = {
    apiToken: 'xxx',
    workspaceId: 'invalid-123',
    variableName: 'abc',
  };

  let capturedOutput = '';
  const stdHook = hookStd((text: string) => {
    capturedOutput += text;
  });

  try {
    await run(input.apiToken, input.workspaceId, input.variableName);
    stdHook.unhook();
  } catch (err) {
    stdHook.unhook();
    // do nothing else, we expect this run command to fail.
  } finally {
    nock.cleanAll();
  }

  t.equal(
    capturedOutput,
    // prettier-ignore
    `::error::Terraform Cloud workspace ID looks invalid; it must start with \'ws-\'
::error::Terraform Cloud workspace ID looks invalid; it must start with \'ws-\'
`,
    'should print an appropriate error message.'
  );
  nock.cleanAll();
  t.end();
});

test('🧪 run() should display an appropriate error if the getTFCOutput() method throws.', async (t) => {
  t.plan(1);
  t.teardown(() => sandbox.restore());

  const input = {
    apiToken: 'xxx-invalid',
    workspaceId: 'ws-123',
    variableName: 'abc',
  };

  nock(`https://app.terraform.io`, {
    reqheaders: {
      'content-type': 'application/vnd.api+json',
      authorization: `Bearer ${input.apiToken}`,
    },
  })
    .get(
      `/api/v2/workspaces/${input.workspaceId}/current-state-version?include=outputs`
    )
    .reply(401, {
      errors: [
        {
          status: '401',
          title: 'unauthorized',
        },
      ],
    });
  let capturedOutput = '';
  const stdHook = hookStd((text: string) => {
    capturedOutput += text;
  });

  try {
    await run(input.apiToken, input.workspaceId, input.variableName);
    stdHook.unhook();
  } catch (err) {
    stdHook.unhook();
    // do nothing else, we expect this run command to fail.
  } finally {
    nock.cleanAll();
  }

  t.equal(
    capturedOutput,
    // prettier-ignore
    `::debug::ℹ️ Fetching state output from Terraform Cloud API for workspace ID ws-123 and variable name abc ...
::error::Terraform Cloud API returned an error response with code 401
::error::🚨 Fetching output variable from Terraform Cloud API failed!
`,
    'should print an appropriate error message.'
  );
  nock.cleanAll();
  t.end();
});

test('💣 teardown', (t) => {
  nock.restore();
  nock.cleanAll();
  nock.enableNetConnect();
  sandbox.restore();
  if (isRunningInGithubActions()) unmockGithubOutputEnvironment();
  if (process.exitCode === 1) process.exitCode = 0; // This is required because @actions/core `setFailed` sets the exit code to 0 when we're testing errors.
  t.end();
});
