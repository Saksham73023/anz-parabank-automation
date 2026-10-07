import { After, Before, setDefaultTimeout } from '@cucumber/cucumber';
import { ApiWorld } from './world';
import { ApiClient } from '../utils/apiClient';

setDefaultTimeout(360_000);

/** Creates a fresh API request context before each tagged API scenario. */
Before({ tags: '@api' }, async function (this: ApiWorld) {
  this.apiClient = await ApiClient.create();
});

/** Disposes the scenario API context after each tagged API scenario. */
After({ tags: '@api' }, async function (this: ApiWorld) {
  const client = this.apiClient;
  this.apiClient = undefined;
  await client?.dispose();
});
