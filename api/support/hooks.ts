import { After, Before, setDefaultTimeout } from '@cucumber/cucumber';
import { ApiWorld } from './world';
import { ApiClient } from '../utils/apiClient';

setDefaultTimeout(120_000);

Before({ tags: '@api' }, async function (this: ApiWorld) {
  this.apiClient = await ApiClient.create();
});

After({ tags: '@api' }, async function (this: ApiWorld) {
  const client = this.apiClient;
  this.apiClient = undefined;
  await client?.dispose();
});
