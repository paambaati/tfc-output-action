import test from 'tape';
import nock from 'nock';
import sinon from 'sinon';
import toReadableStream from 'to-readable-stream';
import { readFile } from 'node:fs';
import { promisify } from 'util';
import { getTFCOutput } from '../src/tfc-api';

const readFileAsync = promisify(readFile);

const sandbox = sinon.createSandbox();

test('🛠 setup', (t) => {
  t.plan(0);
  nock.disableNetConnect();
  if (!nock.isActive()) nock.activate();
  t.end();
});

test('🧪 getTFCOutput() should return the output attribute from the API response.', async (t) => {
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

  try {
    const output = await getTFCOutput(
      input.apiToken,
      input.workspaceId,
      input.variableName
    );
    t.same(output.value, 'xyz', 'should return correct expected value');
  } catch (err) {
    t.fail(err);
  } finally {
    nock.cleanAll();
  }
  nock.cleanAll();
  t.end();
});

test('🧪 getTFCOutput() should throw an error if the API returned a non-200 response.', async (t) => {
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
    .reply(401, {
      errors: [
        {
          status: '401',
          title: 'unauthorized',
        },
      ],
    });

  try {
    await getTFCOutput(input.apiToken, input.workspaceId, input.variableName);
    t.fail('should have thrown an error');
  } catch (err) {
    t.same(
      (err as Error).message,
      `Terraform Cloud API returned an error response with code 401`,
      'should throw the correct error message'
    );
  } finally {
    nock.cleanAll();
  }
  nock.cleanAll();
  t.end();
});

test('🧪 getTFCOutput() should throw an error if the output was not found in the API response.', async (t) => {
  t.plan(1);
  t.teardown(() => sandbox.restore());

  const input = {
    apiToken: 'xxx',
    workspaceId: 'ws-123',
    variableName: 'unknown-non-existent-variable',
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

  try {
    await getTFCOutput(input.apiToken, input.workspaceId, input.variableName);
    t.fail('should have thrown an error');
  } catch (err) {
    t.same(
      (err as Error).message,
      `Variable ${input.variableName} not found in 1 outputs retrieved from Terraform Cloud!`,
      'should throw the correct error message'
    );
  } finally {
    nock.cleanAll();
  }
  nock.cleanAll();
  t.end();
});

test('💣 teardown', (t) => {
  t.plan(0);
  nock.restore();
  nock.cleanAll();
  nock.enableNetConnect();
  sandbox.restore();
  if (process.exitCode === 1) process.exitCode = 0; // This is required because @actions/core `setFailed` sets the exit code to 0 when we're testing errors.
  t.end();
});
